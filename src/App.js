import React, { Component } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
// import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import styled from 'styled-components'

import './App.css'
import { StyledText } from './StyledText'
import { StyledLoader } from './Loader'


const TEXTURE_PATH = './rp_eric_rigged_001_dif.jpg'
// const TEXTURE_PATH = 'http://localhost:3000/rp_eric_rigged_001_dif.jpg'

// const MODEL_PATH = './stacy_lightweight.glb'
// const TEXTURE_PATH = './stacy.jpg'
const MODEL_PATH = './eric_v4.gltf'
// const MODEL_PATH = 'http://localhost:3000/eric_v4.gltf'

const AnimationWrapper = styled.div`
  /* scene size is controlled by setting container dimensions */
  height: 800px;
`

class App extends Component {
  constructor(props) {
    super(props);
    this.mountPointRef = React.createRef()
    this.clock = new THREE.Clock()

    this.state = {
      loading: true,
      currentlyAnimating: false,
      backgroundColor: 0xf1f1f1, // color as a hexadecimal int for THREE
    }
  }

  componentDidMount() {
    this.sceneSetup() // setup THREE camera and THREE scene
    this.addCustomSceneOnjects(); // Add everything else to the scene
    this.startAnimationLoop();

    // Listen for window resize changes
    window.addEventListener('resize', this.handleWindowResize);
  }

  // componentWillUnmount() {
  //   // Stop listening for window resize changes
  //   window.removeEventListener('resize', this.handleWindowResize);

  //   window.cancelAnimationFrame(this.requestID);
  //   // remove interactivity 
  //   this.controls.dispose();
// }

  handleWindowResize = () => {
    console.log('window resize...')
    const width = this.mountPointRef.current.clientWidth;
    const height = this.mountPointRef.current.clientHeight;

    this.renderer.setSize( width, height );
    // update the camera to match the proportions of the viewport
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  };

  // Setup the scene, camera and renderer
  sceneSetup = () => {
    let width = this.mountPointRef.current.clientWidth // window.innerWidth;
    let height = this.mountPointRef.current.clientHeight // window.innerHeight; 

    // Setup Scene
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(this.state.backgroundColor);
    // if your floor and background color are different, it can come in handy to blur those together with fog
    this.scene.fog = new THREE.Fog(this.state.backgroundColor, 60, 100);


    // ##### Init the renderer #####
    this.renderer = new THREE.WebGLRenderer()
      // {
      // canvas, // canvas reference
      // antialias: true // enabling antialiasing
    // });
    this.renderer.setSize( width, height); // set the size of the renderer
    this.renderer.shadowMap.enabled = true; // enable shadowMap so that the character can cast a shadow
    this.renderer.setPixelRatio(window.devicePixelRatio); // set the pixel ratio to be that of the device

    // mount using the react ref
    this.mountPointRef.current.appendChild( this.renderer.domElement );

    // Setup a camera
    this.camera = new THREE.PerspectiveCamera(
      50, // fov (field of view)
      width / height, // aspect ratio
      0.1, // near clipping plane (anything closer than this wont be rendered)
      1000 // far clipping plane (anything further away than this wont be rendered)
    );
    // set a distance from the cube( cube is located at z = 0)
    this.camera.position.z = 5;
  };

  // adding any custom Three.js objects into a scene
  addCustomSceneOnjects = () => {
    // ##### Add lights #####
    // 1. Hemisphere light
    // white(0xffffff) light, and its intensity is at 0.61. (white sky, white ground, intensity)
    let hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.61);
    // light position 50 units above center
    hemiLight.position.set(0, 50, 0);
    // Add light to scene
    this.scene.add(hemiLight);
    
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
    this.scene.add(dirLight);

    // ##### Floor #####
    //                            PlaneGeometry(width, height, widthSegments, heightSegments)
    // 5000 units is huge to ensure a seamless background
    let floorGeometry = new THREE.PlaneGeometry(10000, 10000, 1, 1);
    // combine geometry and materials into a mesh, and this mesh is a 3D object in our scene
    let floorMaterial = new THREE.MeshPhongMaterial({
      color: 0xeeeeee, //  0xeeeeee which is slightly darker than the background, because the lights shine on this floor, but our lights don’t affect the background
      shininess: 0,
    });

    let floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -0.5 * Math.PI;
    floor.receiveShadow = true;
    floor.position.y = -11;
    this.scene.add(floor);

    // ##### Environment #####
    // The colored dot behind the model
    let geometry = new THREE.SphereGeometry(5, 32, 32);
    let material = new THREE.MeshBasicMaterial({ color: 0xff7f50 }); // 0xHEX
    let sphere = new THREE.Mesh(geometry, material);
    sphere.position.z = -25;
    sphere.position.y = 2.5;
    sphere.position.x = 0.25;
    this.scene.add(sphere);

    // ##### Model #####
    // ##### 1. texture #####
    let model_texture = new THREE.TextureLoader().load(TEXTURE_PATH)
    model_texture.flipY=false

    const model_mtl = new THREE.MeshPhongMaterial({ // mtl === material
      map: model_texture,
      color: 0xffffff,
      skinning: true
    })

    let loader = new GLTFLoader()
    loader.load(
      MODEL_PATH, // the model to load
      (gltf) => { // called when the resource is loaded
        console.log('gltf, ', gltf)
        let model = gltf.scene;
        let fileAnimations = gltf.animations;

        model.traverse(o => {
          // if (o.isBone) {
          //   console.log(o.name);
          // }
          if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
            o.material = model_mtl
          }
          // Reference the neck and waist bones
          if (o.isBone && o.name === 'mixamorigNeck') { 
            this.neck = o;
          }
          if (o.isBone && o.name === 'mixamorigSpine') { 
            this.waist = o;
          }
        });
        
        model.scale.set(0.015, 0.015, 0.015) // Set the models initial scale to 7x default
        model.position.y = -1.2 // put the models feet on the ground
        console.log('modelll: ', model)
        this.scene.add(model) // add the model to the scene
        // console.log('aa', aa)
        this.setState({ loading: false }, () => { console.log('finished loading')})

        // ##### create a new AnimationMixer ##### 
        // an AnimationMixer is a player for animations on a particular object in the scene
        this.mixer = new THREE.AnimationMixer(model)
        let clips = fileAnimations.filter(val => val.name !== 'idle') // animations not called 'idle' 
        this.possibleAnims = clips.map(val => {
          let clip = THREE.AnimationClip.findByName(clips, val.name)
          // remove the neck and the waist from inside the animation,
          // so that the mouse follow works
          clip.tracks.splice(3, 3)
          clip.tracks.splice(9, 3)
          clip = this.mixer.clipAction(clip)
          return clip;
         }
        )
        console.log('num of possibleAnimations: ', this.possibleAnims.length)

        let idleAnim = THREE.AnimationClip.findByName(fileAnimations, 'idle');
        // remove the neck and the waist from inside the animation,
        // splice the tracks array to remove 3,4,5 and 12,13,14.
        // once I splice 3,4,5 then the neck becomes 9,10,11.
        // spine (waist)
        idleAnim.tracks.splice(3, 3);
        // neck
        idleAnim.tracks.splice(9, 3);
        
        this.idle = this.mixer.clipAction(idleAnim);
        this.idle.play()
      },
      // called while loading model
      ( xhr ) => {
        if (xhr.lengthComputable) {
          console.log( `Model is ${( xhr.loaded / xhr.total * 100 )}% loaded`);
        } else {
          console.log('Loading model...')
        }        
      },
      // on error
      (err) => {
        console.log('What an ERROR! ', err)
      }
    )
  };

  /**
   * This will create a loop that causes the renderer to draw the scene 
   * every time the screen is refreshed (on a typical screen this means 60 times per second).
   * 
   * requestAnimationFrame has a number of advantages over setInterval.
   * Including pausing when the user navigates to another browser tab. 
   * 
   * refresh rate of the screen should not be confused with frames per second (FPS): 
   * having FPS equal screen refresh rate is desirable
   * */ 
  startAnimationLoop = () => {
    if (this.mixer) {
      // console.log('HERE', this.clock.getDelta())
      this.mixer.update(this.clock.getDelta()); // see note at the definition of clock
    }

    this.renderer.render( this.scene, this.camera )
    // The window.requestAnimationFrame() method tells the browser that you wish to perform
    // an animation and requests that the browser call a specified function
    // to update an animation before the next repaint
    this.requestID = window.requestAnimationFrame(this.startAnimationLoop);
  };

  render() {
    return (
      <>
        {this.state.loading ? (<StyledLoader />) : null}
        <StyledText>React + Three.js Experiment</StyledText>
        <AnimationWrapper ref={this.mountPointRef} />
        <StyledText>Made by Will Cook</StyledText>
      </>
    );
  }
}

export default App;
