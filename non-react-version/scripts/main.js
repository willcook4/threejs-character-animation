/* global THREE */

/** Note that because there is a bit of setup here that would otherwise be in global scope
 * the entire project is wrapped in a function
 */
(function() {
  // Set our main variables
  let scene,  
    renderer,
    camera,
    model,                              // Our character
    neck,                               // Reference to the neck bone in the skeleton
    waist,                               // Reference to the waist bone in the skeleton
    // leftArm,
    possibleAnims,                      // Animations found in our file
    mixer,                              // THREE.js animations mixer
    idle,                               // Idle, the default state our character returns to
    clock = new THREE.Clock(),          // Used for anims, which run to a clock instead of frame rate
    /**
     * The update takes our clock and updates it to that clock. 
     * This is so that any animations don’t slow down if the frame rate slows down.
     * Running an animation to a frame rate, it is then tied to the frames to determine
     * how fast or slow it runs, that’s not what we want.
     */
    currentlyAnimating = false,         // Used to check whether characters neck is being used in another anim
    raycaster = new THREE.Raycaster(),  // Used to detect the click on our character
    loaderAnim = document.getElementById('js-loader');

  // const MODEL_PATH = 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/1376484/stacy_lightweight.glb';
  // const MODEL_PATH = './models/stacy_lightweight.glb'
  // const MODEL_PATH = './models/malcom.gltf'
  // const MODEL_PATH = './models/doug-embedded.gltf'
  // const MODEL_PATH = './models/draft-eric.gltf'
    const MODEL_PATH = './models/eric_v4.gltf'
  // const TEXTURE_PATH = 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/1376484/stacy.jpg'
  // const TEXTURE_PATH = './models/stacy.jpg'
   const TEXTURE_PATH = './models/rp_eric_rigged_001_dif.jpg'

  init();

  function init() {
    const canvas = document.querySelector('#c');
    // Note that Three.js doesn’t reference colors in a string like so “#f1f1f1”,
    // but rather a hexadecimal integer like 0xf1f1f1
    const backgroundColor = 0xf1f1f1;

    // ##### Init the scene #####
    scene = new THREE.Scene();
    scene.background = new THREE.Color(backgroundColor);
    // if your floor and background color are different, it can come in handy to blur those together with fog
    scene.fog = new THREE.Fog(backgroundColor, 60, 100);

    // ##### Init the renderer #####
    renderer = new THREE.WebGLRenderer({
      canvas, // canvas reference
      antialias: true // enabling antialiasing
    });
    renderer.shadowMap.enabled = true; // enable shadowMap so that the character can cast a shadow
    renderer.setPixelRatio(window.devicePixelRatio); // set the pixel ratio to be that of the device
    document.body.appendChild(renderer.domElement); // add our renderer to our document body.

    // ##### Add a camera #####
    camera = new THREE.PerspectiveCamera(
      50, // setting the field of view to 50degrees (default: 50)
      window.innerWidth / window.innerHeight, // the size to that of the window
      0.1, // the near clipping plane (default: 0.1)
      1000 // far clipping plane (default: 2000)
    );
    // positioning the camera to be 30 units back, and 3 units down
    camera.position.z = 30 
    camera.position.x = 0;
    camera.position.y = -2;
    
    // ##### Add lights #####
    // 1. Hemisphere light
    // white(0xffffff) light, and its intensity is at 0.61. (white sky, white ground, intensity)
    let hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.61);
    // light position 50 units above center
    hemiLight.position.set(0, 50, 0);
    // Add light to scene
    scene.add(hemiLight);
    
    // 2. Directional light
    let d = 8.25; // d can be adjusted until the shadows aren’t clipping in strange places
    //                 THREE.DirectionalLight(color, intensity)
    let dirLight = new THREE.DirectionalLight(0xffffff, 0.54);
    dirLight.position.set(-8, 12, 8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize = new THREE.Vector2(1024, 1024);
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 1500;
    dirLight.shadow.camera.left = d * -1;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = d * -1;
    // Add the directional Light to scene
    scene.add(dirLight);


    // ##### Floor #####
    //                            PlaneGeometry(width, height, widthSegments, heightSegments)
    // 5000 units is huge to ensure a seamless background
    let floorGeometry = new THREE.PlaneGeometry(5000, 5000, 1, 1);
    // combine geometry and materials into a mesh, and this mesh is a 3D object in our scene
    let floorMaterial = new THREE.MeshPhongMaterial({
      color: 0xeeeeee, //  0xeeeeee which is slightly darker than the background, because the lights shine on this floor, but our lights don’t affect the background
      shininess: 0,
    });

    let floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -0.5 * Math.PI;
    floor.receiveShadow = true;
    floor.position.y = -11;
    scene.add(floor);

    // ##### Environment #####
    // The colored dot behind the model
    let geometry = new THREE.SphereGeometry(8, 32, 32);
    let material = new THREE.MeshBasicMaterial({ color: 0xF7E58D }); // 0xHEX
    let sphere = new THREE.Mesh(geometry, material);
    sphere.position.z = -25;
    sphere.position.y = -2.5;
    sphere.position.x = -0.25;
    scene.add(sphere);
    
    // ##### Model #####
    // ##### 1. texture #####
    let stacy_texture = new THREE.TextureLoader().load(TEXTURE_PATH)
    stacy_texture.flipY=false

    const stacy_mtl = new THREE.MeshPhongMaterial({ // mtl === material
      map: stacy_texture,
      color: 0xffffff,
      skinning: true
    })

    let loader = new THREE.GLTFLoader();

    loader.load(
      // the model to load
      MODEL_PATH,
      // called when the resource is loaded
      function(gltf) {
        console.log('gltf, ', gltf)
        model = gltf.scene;
        let fileAnimations = gltf.animations;
        // console.log(gltf.scene)

        model.traverse(o => {
          // if (o.isBone) {
          //   console.log(o.name);
          // }
          if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
            o.material = stacy_mtl
          }
          // Reference the neck and waist bones
          if (o.isBone && o.name === 'mixamorigNeck') { 
            neck = o;
          }
          if (o.isBone && o.name === 'mixamorigSpine') { 
            waist = o;
          }
        });
        
        model.scale.set(0.1, 0.1, 0.1); // Set the models initial scale to 7x default
        model.position.y = -11; // put the models feet on the ground
        scene.add(model); // add the model to the scene
        loaderAnim.remove();

        // ##### create a new AnimationMixer ##### 
        // an AnimationMixer is a player for animations on a particular object in the scene
        mixer = new THREE.AnimationMixer(model);
        let clips = fileAnimations.filter(val => val.name !== 'idle'); // animations not called 'idle' 
        possibleAnims = clips.map(val => {
          let clip = THREE.AnimationClip.findByName(clips, val.name);
          // remove the neck and the waist from inside the animation,
          // so that the mouse follow works
          clip.tracks.splice(3, 3);
          clip.tracks.splice(9, 3);
          clip = mixer.clipAction(clip);
          return clip;
         }
        );
        console.log('num of possibleAnimations: ', possibleAnims.length)

        let idleAnim = THREE.AnimationClip.findByName(fileAnimations, 'idle');
        // remove the neck and the waist from inside the animation,
        // splice the tracks array to remove 3,4,5 and 12,13,14.
        // once I splice 3,4,5 then the neck becomes 9,10,11.
        // spine (waist)
        idleAnim.tracks.splice(3, 3);
        // neck
        idleAnim.tracks.splice(9, 3);
        // console.log(idleAnim.tracks)
        
        idle = mixer.clipAction(idleAnim);
        idle.play();
      },
      // called while loading model
      function ( xhr ) {
        if(xhr && xhr.lengthComputable) {
          console.log( `Model is ${( xhr.loaded / xhr.total * 100 )}% loaded`)
        } else {
          console.log('loading model...')
        }
      },
      // on error
      function(err) {
        console.log('ERROR: ', err)
      }
    )
  }
  // END init fn

  // Three.js relies on is an update function, which runs every frame
  function update() {
    if (mixer) {
      mixer.update(clock.getDelta()); // see note at the definition of clock
    }

    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }
    renderer.render(scene, camera);
    requestAnimationFrame(update);
  }

  update();

  // Did the window size change?
  function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let canvasPixelWidth = canvas.width / window.devicePixelRatio;
    let canvasPixelHeight = canvas.height / window.devicePixelRatio;

    const needResize =
      canvasPixelWidth !== width || canvasPixelHeight !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }
    return needResize; // boolean
  }

  // ##### Event Listeners #####
  window.addEventListener('click', e => raycast(e));
  window.addEventListener('touchend', e => raycast(e, true));

  /**
   * making a link from the mouse to the model (raycasting)
   * if they overlap then play an animation (playOnClick)
   */
  function raycast(e, touch = false) {
    let mouse = {};
    if (touch) {
      mouse.x = 2 * (e.changedTouches[0].clientX / window.innerWidth) - 1;
      mouse.y = 1 - 2 * (e.changedTouches[0].clientY / window.innerHeight);
    } else {
      mouse.x = 2 * (e.clientX / window.innerWidth) - 1;
      mouse.y = 1 - 2 * (e.clientY / window.innerHeight);
    }
    // update the picking ray with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // calculate objects intersecting the picking ray
    let intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects[0]) {
      // console.log('intersects: ', intersects)
      // let object = intersects[0].object;
      // if (object.name === 'eric') {
        // NOTE, eric v4 does not name the correct naming, missing object.name === 'eric'
        if (!currentlyAnimating) {
          currentlyAnimating = true;
          playOnClick();
        }
      // }
    }
  }

  // Get a random animation, and play it 
  // A random number between 0 and the length of the possibleAnims array,
  // then we call another function called playModifierAnimation. 
  
  function playOnClick() {
    let anim = Math.floor(Math.random() * possibleAnims.length) + 0;
    playModifierAnimation(idle, 0.25, possibleAnims[anim], 0.25);
  }

  // takes in idle (we’re moving from idle),
  // the speed to blend from idle to a new animation (possibleAnims[anim]),
  // and the last argument is the speed to blend from the animation back to idle.
  // Fades from idle, plays an animation and once it’s completed, fades back to idle, allowing another click on the model.
  function playModifierAnimation(from, fSpeed, to, tSpeed) {
    // to animation is the animation that’s about to play next
    to.setLoop(THREE.LoopOnce); // play once
    to.reset();
    to.play();
    from.crossFadeTo(to, fSpeed, true); // fade from (idle) to the new animation using our first speed (fSpeed, aka from speed)
    
    setTimeout(function() { // timeout function
      from.enabled = true; // we turn the from animation (idle) back to true, 
      to.crossFadeTo(from, tSpeed, true); // we cross fade back to idle,
      currentlyAnimating = false; // then we toggle currentlyAnimating back to false (allowing another click on model)
    }, to._clip.duration * 1000 - ((tSpeed + fSpeed) * 1000)); // The time of the setTimeout is calculated by combining our animations length (* 1000 as this is in seconds instead of milliseconds), and removing the speed it took to fade to and from that animation (also set in seconds, so * 1000 again)
  }

  document.addEventListener('mousemove', function(e) {
    var mousecoords = getMousePos(e);
    // console.log('mousecoords: ', mousecoords)
    if (neck && waist) {
      moveJoint(mousecoords, neck, 50); // move neck with 50deg limit
      moveJoint(mousecoords, waist, 30); // move waist with 30deg limit
      // moveJoint(mousecoords, leftArm, 70); // TEST move leftArm with 70deg limit 
    }
  });
  
  function getMousePos(e) {
    return { x: e.clientX, y: e.clientY };
  }

  // current mouse position, the joint we want to move, the limit (in degrees) that the joint is allowed to rotate
  function moveJoint(mouse, joint, degreeLimit) {
    let degrees = getMouseDegrees(mouse.x, mouse.y, degreeLimit);
    joint.rotation.y = THREE.Math.degToRad(degrees.x);
    joint.rotation.x = THREE.Math.degToRad(degrees.y);
  }

  /**
   * getMouseDegrees does this: 
   * It checks the top half of the screen, 
   * the bottom half of the screen, 
   * the left half of the screen 
   * and the right half of the screen. 
   * 
   * It determines where the mouse is on the screen in a percentage 
   * between the middle and each edge of the screen.
   * 
   * For instance, if the mouse is half way between the middle of the 
   * screen and the right edge. The function determines that right = 50%, 
   * 
   * if the mouse is a quarter of the way UP from the center, 
   * the function determines that up = 25%.
   * 
   * Once the function has these percentages, 
   * it returns the percentage of the degreelimit.
   * 
   * So the function can determine your mouse is 75% right and 50% up,
   * and return 75% of the degree limit on the x axis and 50% of the 
   * degree limit on the y axis. Same for left and right.
   */
  function getMouseDegrees(x, y, degreeLimit) {
    let dx = 0,
        dy = 0,
        xdiff,
        xPercentage,
        ydiff,
        yPercentage;
  
    let w = {
      x: window.innerWidth,
      y: window.innerHeight
    };
  
    // ### Left (Rotates neck left between 0 and -degreeLimit) ###
    // 1. If cursor is in the left half of screen
    if (x <= w.x / 2) {
      // 2. Get the difference between middle of screen and cursor position
      xdiff = w.x / 2 - x;  
      // 3. Find the percentage of that difference (percentage toward edge of screen)
      xPercentage = (xdiff / (w.x / 2)) * 100;
      // 4. Convert that to a percentage of the maximum rotation we allow for the neck
      dx = ((degreeLimit * xPercentage) / 100) * -1;
    }
    
    // ### Right (Rotates neck right between 0 and degreeLimit) ###
    if (x >= w.x / 2) {
      xdiff = x - w.x / 2;
      xPercentage = (xdiff / (w.x / 2)) * 100;
      dx = (degreeLimit * xPercentage) / 100;
    }
    
    // ### Up (Rotates neck up between 0 and -degreeLimit) ###
    if (y <= w.y / 2) {
      ydiff = w.y / 2 - y;
      yPercentage = (ydiff / (w.y / 2)) * 100;
      // Note that I cut degreeLimit in half when she looks up
      dy = (((degreeLimit * 0.5) * yPercentage) / 100) * -1;
    }
    
    // ### Down (Rotates neck down between 0 and degreeLimit) ###
    if (y >= w.y / 2) {
      ydiff = y - w.y / 2;
      yPercentage = (ydiff / (w.y / 2)) * 100;
      dy = (degreeLimit * yPercentage) / 100;
    }
    
    return {
      x: dx,
      y: dy 
    };
  }
})();
