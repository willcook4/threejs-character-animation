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
    possibleAnims,                      // Animations found in our file
    mixer,                              // THREE.js animations mixer
    idle,                               // Idle, the default state our character returns to
    clock = new THREE.Clock(),          // Used for anims, which run to a clock instead of frame rate 
    currentlyAnimating = false,         // Used to check whether characters neck is being used in another anim
    raycaster = new THREE.Raycaster(),  // Used to detect the click on our character
    loaderAnim = document.getElementById('js-loader');

  const MODEL_PATH = 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/1376484/stacy_lightweight.glb';

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
    camera.position.y = -3;
    
    
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
    
    // ##### Model #####
    let loader = new THREE.GLTFLoader();

    loader.load(
      // the model to load
      MODEL_PATH,
      // called when the resource is loaded
      function(gltf) {
        model = gltf.scene;
        let fileAnimations = gltf.animations;

        model.traverse(o => {
          if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
          }
        });

        
        model.scale.set(7, 7, 7); // Set the models initial scale to 7x default
        model.position.y = -11; // put the models feet on the ground
        scene.add(model); // add the model to the scene
      },
      // called while loading model
      function ( xhr ) {
        console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
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

})();
