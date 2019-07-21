
let APP = {
    amp: 30,
    count: 20,

    start_length: 0.9,
    freq_step: 1/90,

    lengths:[],
    balls: []
};

let query_params = {
    amp: 'amp',
    count: 'count',
    start: 'start_length',
    step: 'freq_step'
}

function parse_query(){
    var query = window.location.search.substring(1);
    var vars = query.split('&');
    let data = {};
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split('=');
        data[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
    }
    return data;
}

$(document).ready(
    function(){
        APP.init(parse_query());
        $('#submit').click(() => {
            let location = window.location.href.split('?')[0];
            let params = {
                amp: $("#amp").val(),
                start: $("#maxlen").val()/100,
                step: 1/($("#period").val())
            };
            window.location.replace(location + '?' + $.param(params));
        });
    }
)

APP.make_lengths = function(){

    var start_freq = 1 / (2 * Math.PI * Math.sqrt(this.start_length / 9.81));

    console.log("FREQ (Hz), LENGTH(m)");
    for (let i = 0; i < this.count; i++) {
        var freq = start_freq + i * this.freq_step;
        var len = (9.81 / (39.4784176044 * Math.pow(freq, 2) ) );
        console.log(freq, len);
        this.lengths.push(len);
    }
}

APP.init = function(data) {

    for (const key in data) {
        if (data.hasOwnProperty(key) && query_params.hasOwnProperty(key)) {
            const element = data[key];
            this[query_params[key]] = element;
        }
    }

    this.make_lengths();

    this.canvas = document.getElementById("webglcanvas");
    this.container = $("#container");
    this.canvas.width = this.container.width();
    this.canvas.height = this.container.height();
    this.canvas_bounds = this.canvas.getBoundingClientRect();
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.shadowMapEnabled = true;
    this.renderer.shadowMapType = THREE.PCFSoftShadowMap;

    this.renderer.setSize(this.canvas.width, this.canvas.height);

    // Create a new Three.js scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    this.camera = new THREE.PerspectiveCamera(
        45,
        this.canvas.width / this.canvas.height,
        0.01,
        2000
    );
    //this.camera.position.set(0, -0, -0.5);
    this.camera.position.set(-0.3431841681966547, 0.1820085204293208, -1.1600803696176978 );
    this.controls = new THREE.OrbitControls(this.camera, this.canvas);
    this.controls.target.y = -0.3;
    this.controls.update();

    // Make balls:
    this.sphere = new THREE.SphereGeometry(0.01, 32, 32);
    this.sphere_material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    this.line_material = new THREE.LineBasicMaterial({color: 0x009900 });

    var depth = 0;
    for (const length of this.lengths) {
        this.make_ball(length, depth);
        depth += 0.05;
    }

    this.scene.add(this.camera);

    APP.lastUpdate = Date.now();
    window.requestAnimationFrame(this.tick);

    window.addEventListener('resize', () => { APP.adjust_viewport() });
}.bind(APP);

function calc_period(l){
    return 2 * Math.PI * Math.sqrt(l/9.81);
}

APP.make_ball = function(l, z){
    let ball = new THREE.Mesh(this.sphere, this.sphere_material);
    ball.position.y = -l;

    var geometry = new THREE.Geometry();
    geometry.vertices.push(
        new THREE.Vector3(0,0,0),
        new THREE.Vector3(0,-l,0)
    );

    let string = new THREE.Line(geometry, this.line_material);


    let mesh = new THREE.Object3D();
    mesh.add(ball);
    mesh.add(string);

    //mesh.applyMatrix(new THREE.Matrix4().makeTranslation(0, l, z));
    mesh.applyMatrix(new THREE.Matrix4().makeTranslation(0, 0, z));

    this.balls.push({
        mesh: mesh,
        length: l,
        period: calc_period(l),
        vel: 0,
        thet: this.amp * 0.0174533,
        amp: this.amp
    });
    this.scene.add(mesh);
}.bind(APP);

APP.tick = function() {
    window.requestAnimationFrame(this.tick);
    var now = Date.now();
    var delta = now - this.lastUpdate;
    this.lastUpdate = now;

    this.controls.update();
    this.update(delta/1000);
    // Render the scene
    this.renderer.render(this.scene, this.camera);
}.bind(APP);

APP.update = function(delta) {
    this.balls.forEach(element => {
        // Yay for differential equations!
        element.vel += (
            -9.81 / element.length * Math.sin(element.thet) 
            - 0.005 * element.vel
            ) * delta;
        element.thet += element.vel * delta;
        element.mesh.rotation.z = element.thet;
    });
}.bind(APP);

APP.adjust_viewport = function () {
    this.canvas.width = this.container.width();
    this.canvas.height = this.container.height();
    this.canvas_bounds = this.canvas.getBoundingClientRect();
    this.camera.aspect = this.canvas.width / this.canvas.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.canvas.width, this.canvas.height);
}.bind(APP);
