const Midis = {};
const Models = {}; 
const validSeq = new RegExp('[a-d]')
var playing = true;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

window.onload = attachListeners;

function attachListeners() {
    var midiSelect = document.getElementById("midiSelect");
    midiSelect.addEventListener("change", (event) => {
        let e = event.target;
        let key = e.selectedOptions[0].value;
        if(key != "select midi file"){
            updateTrackSelect(key);
        }
    });
    var tossTest = document.getElementById("tossTest");
    tossTest.addEventListener("input", e =>{
        const value = e.target.value / 100;
        e.target.labels[0].innerHTML = `${value}`
        toss.adjust(value)
    })
    var tci = document.getElementById("textChainInput");
    tci.value = ""
    tci.addEventListener("input", (e) => {
        if(!validSeq.test(e.data)){
            e.target.value = e.target.value.slice(0,-1);
        }
        markovDemo.updateTextModel(e.target.value);
    });
    markovDemo.textModel();
    sequencer.init();
    const width = 400;
    const height = 300;

    d3.select('#graphBox')
        .append("svg")
        .attr('id', 'mGraph')
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [-width / 2, -height / 2, width, height])
        .attr("style", "max-width: 100%; height: auto; height: intrinsic;");
}
const toss = new coinToss();
function coinToss () {
    const sides = [{
        'bound': 0.5,
        'count': 0,
        'label': 'heads'
    },{
        'bound': 1.0,
        'count': 0,
        'label': 'tails'
    }]
    var total = 0;
    function flip(){
        const r = Math.random();
        var choice = 0;
        sides.reduce((acc,d,i) => {
            if(acc < r){
                choice = i;
            }
            return acc += d.bound;
        }, 0)
        return choice;
    }
    function adjust(amt){
        sides[0].bound = amt;
        sides[1].bound = 1.0 - amt;
    }
    this.adjust = adjust
    this.update = function(){
        const svg = d3.select('#coinToss');
        const w = svg.node().clientWidth;
        const h = svg.node().clientHeight;
        svg.selectAll("rect")
            .data(sides)
            .join("rect")
            .attr('x', (d,i) => (w/3 * i) + w/3/2)
            .attr('y', (d,i) => total ? (h - (d.count/total)*h) : 0)
            .attr('width', w/3)
            .attr('height', d => total ? (d.count/total)*h : 0)
            .attr('fill', 'tomato')
        svg.selectAll("text")
            .data(sides)
            .join("text")
            .attr('x', (d,i) => (w/3 * i) + w/3)
            .attr('y', (d,i) => total ? (h - 20 - (d.count/total)*h/2) : 0)
            .attr('fill', 'black')
            .attr('font-size', 22)
            .text(d => total ? `${d.label}` + (d.count/total).toPrecision(4) : '')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')


    }
    this.flip = function(n=1){
        for(let i = 0; i < n; i++){
            sides[flip()].count++
            total++
        }
        this.update()
    }
    this.flip10k = function(){
        this.flip(10000)
    }
    this.clear = function(){
        sides.forEach(d => d.count=0)
        total = 0;
        this.update();
    }
}
const markovDemo = new demo1();
function demo1 (){
    const textMarkov = new Markov();
    const headers = ['', 'a', 'b', 'c', 'd'];
    const itoa = (i) => headers[i];
    const atoi = (a) => headers.findIndex(h => a == h);
    this.updateTextModel = (sequence) => {
        const seqArr = [...sequence]
        textMarkov.clear();
        const table = d3.select('#textChain')
        table.selectAll('rect.dtab')
            .attr('fill', 'lightgrey')
            .datum(0)
        table.selectAll('text.dtab')
            .text('--')
            .datum(0)
        seqArr.forEach(t => textMarkov.add(t));
        textMarkov.model();
        const newData = textMarkov.data();
        newData.forEach((item) => {
            const loc = d3
                .selectAll(`.row${item.transition[0]}.col${item.transition[1]}`);
            loc.select('text')
                .text(item.probability.toFixed(2))
                .datum(item.probability);
            loc.select('rect')
                .datum(item.probability)
                .attr('fill', d3.interpolateLab("steelblue", "tomato")(item.probability));
        })
    }
    this.textModel = () => {
        const classify = (i) => {
            var str = `row${itoa(row(i))} col${itoa(col(i))}`;
            str += col(i) && row(i) ? ' dtab' : '';
            return str;
        }
        const col = (i=null) => i == null ? 5 : i % 5;
        const row = (i=null) => i == null ? 5 : ~~(i/5);
        const array = new Array(25).fill(0);
        const svg = d3.select("#textChain");
        const w = svg.attr('width');
        const h = svg.attr('height');
        const dx = w / col();
        const dy = h / row();
        const map = svg.selectAll("g")
            .data(array)
            .join("g")
            .attr('transform', (d,i) => {
                return `translate(${col(i)*dx}, ${row(i)*dy})`
            })
            .attr('class', (d,i) => classify(i))

        map.append("rect")
            .attr('width', dx)
            .attr('height', dy)
            .attr('fill', (d,i) => col(i) && row(i) ? 'lightgrey' : 'white')
            .attr('class', (d,i) => classify(i))

        map.append("text")
            .text((d,i) => col(i) && row(i) ? '--' : itoa(col(i) || row(i)))
            .attr('fill', 'black')
            .attr('font-size', '32')
            .attr('x', dx/2)
            .attr('y', dy/2)
            .attr('class', (d,i) => classify(i))
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
    }
    function lookAtStep (a){
        const values = d3.selectAll(`text.row${a}.dtab`).data();
        var acc = 0;
        const data = [];
        values.forEach((v,i) => {
            data.push({'x': acc, 'p':v, 'key': itoa(i+1)});
            acc += v;
        })
        const bar = d3.select('#probBar')
        const w = d3.select('#textProb').node().clientWidth;
        const h = d3.select('#textProb').node().clientHeight;
        bar.selectAll("rect")
            .data(data)
            .join("rect")
            .attr("width", d => d.p*w)
            .attr("height", h/3)
            .attr('x', d => d.x*w)
            .attr('y', 2*h/3)
            .attr('fill', d => d3.interpolateLab('steelblue','tomato')(d.p))
        
        return data;
    }
    function selectTableRow (row) {
        if(row == 0){
            d3.select("#rowSelectionBorder").lower()
        } else {
            const svg = d3.select("#textChain")
            const w = svg.node().clientWidth
            const h = svg.node().clientHeight / 5;
            svg.select("#rowSelectionBorder").raise()
                .attr('y', row * h)
                .attr('width', w)
                .attr('height', h)
        }
        return itoa(row);
    }
    function randomNumber(){
        const r = Math.random();
        d3.select('#textRandom')
            .text(r.toFixed(2))
        const w = d3.select('#textProb').node().clientWidth;
        const h = d3.select('#textProb').node().clientHeight;
        const tx = Math.trunc(r*w);
        const ty = Math.trunc(h/3);
        d3.select('#probMeter')
            .attr('transform', `translate(${tx},${ty})`)
        return r;

    }
    this.runTextModel = async function (){
        var a = textMarkov.init();
        var r = atoi(a);
        var n;
        while(playing){
            selectTableRow(r);
            await wait(1000);
            const data = lookAtStep(a);
            await wait(1000);
            const rand = randomNumber(n);
            await wait(1000);
            r = 0;
            data.forEach((d,i) => {
                if(d.x < rand){
                    r = i;
                };
            })         
            a = data[r].key;
            r++;
        }
        selectTableRow(0);
    }
}

function updateTrackSelect(key){
    const form = d3.select("#trackSelect");
    form.selectChildren().remove();
    form.selectAll("div")
        .data(Midis[key].tracks)
        .join("div")
        .append("label")
        .text(d => d.name)
            .append("input")
            .attr("id", d => d.name)
            .attr("type", "checkbox")
            //.("checked", d => d.isSelected)
            .attr("name", "ts")
            .on("change", (d,i) => {
                updateTMapSelect(d.target.checked, i.name)
            })
    midiToTrackMaps(Midis[key]);
}

function dropHandler(ev) {  
    // Prevent default behavior (Prevent file from being opened)
    ev.preventDefault();
  
    if (ev.dataTransfer.items) {
        // Use DataTransferItemList interface to access the file(s)
        [...ev.dataTransfer.items].forEach((item, i) => {
        // If dropped items aren't files, reject them
            if (item.kind === "file") {
                const file = item.getAsFile();
                sendFileToMP(file);
            }
        });
    } else {
      // Use DataTransfer interface to access the file(s)
        [...ev.dataTransfer.files].forEach((file, i) => {
            sendFileToMP(file);
        });
    }
}

function dragOverHandler(ev) {  
    // Prevent default behavior (Prevent file from being opened)
    ev.preventDefault();
}

function sendFileToMP (file){
    file.arrayBuffer().then(buff => {
        let bytebuff = new Uint8Array(buff);        
        Midis[file.name] =  new Midi(bytebuff);
        filterMidi(file.name);
        updateMidiSelect();
    })
    
}

function filterMidi (key) {
    let start = Midis[key].tracks.length - 1;
    //remove tracks without note data
    for(let i = start; i >= 0; i--){
        if(!Midis[key].tracks[i].notes.length){
            Midis[key].tracks.splice(i, 1);
        }
    }
    for(track of Midis[key].tracks){
        //generate an id safe string
        //if track chunks have same channel this will overwrite
        track.name = "channel-" + track.channel.toString();
        if(!track.endOfTrackTicks){
            let max = 0;
            for(note of track.notes){
                let test = note.ticks + note.durationTicks;
                max = test > max ? test : max;
            }
            track.endOfTrackTicks = max;
        }
        track['isSelected'] = false;
    }
    Midis[key].name = key;
}

function updateMidiSelect(){
    d3.select("#midiSelect")
        .selectAll("option[value]")
        .data(Object.keys(Midis))
        .join("option")
        .text(d => d)
        .attr('value', d => d)
}

function updateTMapSelect(state, name){
    //state tracking in the object is unecessary atm
    //Midis[currMidi].tracks.find( (track) => {
    //    return track.name == targetTrack;
    //}).isSelected = state;
    d3.select("#pRoll")
        .select("#"+name+"svg")
        .style('filter', state ? "" : "url(#grayscale)");
}

//obsolete: tracks aren't merged, new models are made
function mergeTracks(file, track1, track2){
    //make recursive?
    const midifile = Midis[file];
    const tracks = midifile.tracks;
    const dest = tracks.find(track => track.name == track1);
    const src = tracks.find(track => track.name == track2);
    while(src.notes.length)
    {
        dest.notes.push(src.notes.pop());
    }
    dest.endOfTrackTicks =  dest.endOfTrackTicks > src.endOfTrackTicks ?
                            dest.endOfTrackTicks : src.endOfTrackTicks;
    dest.name = dest.name + " + " + src.name;
    tracks.splice(tracks.indexOf(src), 1);
    updateTrackSelect(file);
}

function mergeTrackMaps (...args) {
    let merged = new Map();
    for(map of args){
        map.forEach((v,k,m) => {
            if(merged.has(k)){
                for(note of v){
                    merged.get(k).push(note);
                }
            } else {
                merged.set(k, v);
            }
        })
    }
    testMaps.push(merged);
}

function tracksToMapByAttr(midiTrack, attr){
    var map = new Map();
    midiTrack.forEach(track => {
        track.notes.forEach(note => {
            map.set(note[attr], [...(map.get(note[attr]) || []), note])
        })
    })
    return map
}

function mapSelectedMidi(){
    const file = document.getElementById("midiSelect").selectedIndex;
    const midiData = Midis[file];
    testMaps.push(tracksToMapByAttr(midiData.tracks, "ticks"));
}

function midiToTrackMaps(midi){
    d3.select("#pRoll")
        .selectAll("g")
            .data(midi.tracks)
            .join("g")
            .attr('id', d => d.name + "svg")
            .style('filter', 'url(#grayscale)')
            .selectAll("rect")
                .data(d => d.notes.map((note) => {
                    return {...note, 'dur': d.endOfTrackTicks}
                }))
                .join("rect")
                .attr('x', n => n.ticks / n.dur * 500)
                .attr('y', n => 255 - n.midi*2)
                .attr('width', n => n.durationTicks / n.dur * 500)
                .attr('height', 2)
                .attr('fill', d => {
                    return d3.interpolateLab("steelblue", "tomato")(d.velocity)
                });
}
//const graph = new Graph();

const Graph = function() {
    var nodes = [];
    var links = [];
    const scale = ['D#3','F3','G3','A3','A#3','C4','D4','D#4'];
    this.update = function(data){
        const svg = d3.select('#mGraph').html("")
        nodes.splice(0, nodes.length);
        links.splice(0, links.length);
        nodes = data.nodes.map(n => { return {...n} });
        links = data.links.map(l => { return {...l} });
        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links)
                .id(function (d) {return d.id}))
                //.strength(function (_) {return 100}))
            .force("charge", d3.forceManyBody().strength(d => -300))
            .force("center",  d3.forceCenter())
            //.randomSource(d => d.id)
            .stop()

        simulation.tick(1300);
            //.attr("stroke", typeof linkStroke !== "function" ? linkStroke : null)
            //.attr("stroke-opacity", linkStrokeOpacity)
            //.attr("stroke-width", typeof linkStrokeWidth !== "function" ? linkStrokeWidth : null)
            //.attr("stroke-linecap", linkStrokeLinecap)
        svg.selectAll("line")
        .data(links)
        .join("line")
            .attr('source', d => d.source.id)
            .attr('target', d => d.target.id)
            .attr('class', d => `from-${d.source.id} to-${d.target.id}`)
            .attr('stroke', 'lightgrey')
            .attr('stroke-width', 3)
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);
    
        svg.selectAll("circle")
        .data(nodes)
        .join("circle")
            .attr('id', d => `node-${d.id}`)
            .attr('fill', 'lightgrey')
            .attr("r", 20)
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);
        
        svg.selectAll("text")
            .data(nodes)
            .join("text")
                .attr('fill', 'black')
                .attr('font-size', '18')
                .attr('x', d => d.x)
                .attr('y', d => d.y)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .text(d => scale[7 - d.id])
            //.on("tick", ticked);
    }
    this.highlight = function(data){

        const hm = d3.select(`#node-${data.curr}`)
            .attr('fill', 'white')
            .attr('stroke', 'gold')
            .attr('stroke-width', 5)
        data.next.forEach(n => {
            d3.select(`#node-${n.to}`)
                .attr('fill', d3.interpolateLab('steelblue', 'tomato')(n.value))
            d3.selectAll(`.from-${n.from}.to-${n.to}`)
                .attr('stroke', d3.interpolateLab('steelblue', 'tomato')(n.value))
        })
    }
}

function Markov(){
    const inputs = new Map();
    var last = null;
    var first = null;
    var state = null;
    const set = function(from, to){
        if(!inputs.get(from)){
            inputs.set(from, new Map())
        }
        var row = inputs.get(from)
        if(!row.get(to)){
            row.set(to, {count: 0})
        }
        row.get(to).count++;
    }
    this.clear = function () {
        inputs.clear();
        state = null;
        first = null;
        last = null;
    }
    this.add = function (i){
        if(first == null){
            first = i;
        }
        if(last != null){
            set(last, i);
        }
        last = i;
    }
    //add for hidden markov
    //map level 2 may have different keys
    this.addHidden = function (obs, hid) {
        
    }
    this.init = function (){
        //prime with a random state
        const keys = [ ...inputs.keys()];
        const index = Math.floor(Math.random() * keys.length);
        state = keys[index] != undefined ? keys[index] : null;
        return state;
    }
    this.step = function (){
        state = this.randomChoice();
        return state;
    }
    this.randomChoice = function () {
        const curr = inputs.get(state);
        var acc = 0;
        const choice = Math.random();
        var next = [...curr.keys()][0];
        for([k,v] of curr.entries()){
            if( acc < choice){
                next = k;
            }
            acc += v.prob
        }
        return next;
    }
    this.to = function (s){
        state = s;
        //return next()?
    }
    this.next = function (){
        const values = [];
        if(inputs.has(state)){
            var row = inputs.get(state);
            var transitions = [...row.keys()];
            transitions.forEach((t) => {
                values.push({from: state, to: t, value: row.get(t).prob}) //prob
            }) 
        }
        return values;
    }
    this.close = function (){
        //wrap last to first
        set(last, first);
        return this;
    }
    this.graph = function(){
        const graph = {
        nodes: [],
        links: []
        };
        for(n of inputs.keys()){
            graph.nodes.push({'id': n})
            for([k,v] of inputs.get(n).entries()){
                graph.links.push({
                    'source': n,
                    'target': k,
                    'value': inputs.get(n).get(k).prob
                })
            }
        }
        return graph;
        
    }
    this.model = function (){
        for(input of inputs.values()){
            var total = [...input.values()]
                            .map(v => v.count)
                            .reduce((a,b) => a + b, 0);
            [...input.values()]
                .forEach((v) => {
                    v['prob'] = v.count / total;
                })
        }        
        //could return something?
        return this;
    }
    this.data = function () {
        var data = [];
        for([k,v] of inputs.entries()){
            for([k2,v2] of v.entries()){
                data.push({'transition': [k,k2],
                            'count': v2.count,
                            'probability': v2.prob})
            }
        }
        return data;
    }
}
const sequencer = new Sequencer(16,8);
function Sequencer (steps,notes) {
    const model = new Markov();
    const graph = new Graph();
    const synth = new Tone.Synth(
        { 
            envelope: 
            {
                attack: 0.05,
                decay: 0.1,
                sustain: 0.3,
                release: 0.5
            }
        }
    ).toDestination();
    const scale = ['D#3','F3','G3','A3','A#3','C4','D4','D#4'];
    this.scale = scale;
    const lerp = (v) => d3.interpolateLab('steelblue', 'tomato')(v)
    grid = []
    this.playing = false;
    this.stop = () => this.playing = false
    this.model = model;
    this.init = () => {
        const svg = d3.select("#sequencer");
        const w = svg.attr('width');
        const h = svg.attr('height');
        const col = (i=null) => i == null ? steps : i % steps;
        const row = (i=null) => i == null ? notes : ~~(i/steps);
        const dx = w / col();
        const dy = h / row();
        for(let i = 0; i < col()*row(); i++){
            d = {}
            d['note'] = row(i);
            d['step'] = col(i);
            d['data'] = 0.1;
            d['x'] = col(i) * dx;
            d['y'] = row(i) * dy;
            d['state'] = false
            grid.push(d);
        }
        d3.select('#sequencer')
            .selectAll('g')
            .data(grid)
            .join('g')
            .attr('transform', d => `translate(${d.x}, ${d.y})`)
            .append('rect')
                .attr('class', d => `note${d.note} step${d.step}`)
                .attr('width', dx)
                .attr('stroke', 'white')
                .attr('height', dy)
                .attr('fill', lerp(d.data))
                .on("mouseover", function() {
                    d3.select(this)
                        .attr('fill', d => lerp( d.state ? 0.5: 0.3))
                        
                })
                .on("mouseout", function() {
                    d3.select(this)
                        .attr('fill', d => {
                            const f = d.state ? 0.7 : 0.1;
                            return lerp(f)
                        })
                })
                .on("click", function(event) {
                    const r = d3.select(this);
                    if(!r.datum().state){
                        const step = d3.selectAll(`.step${r.datum().step}`)
                            .filter(d => d.state)
                            .datum(function (d) {
                                d.state = false;
                                d.data = 0.1;
                                return d;
                            })
                        update(step);
                    }
                    r.datum(function (d) { 
                            d.state = !d.state
                            d.data = d.state ? 0.7 : 0.3;
                            return d;
                    })
                    r.attr('fill', d => lerp(d.data))
                    train();
                })
    }
    function update(selection){
        selection.attr('fill', d => lerp(d.data));
    }
    function train(){
        model.clear();
        const active = grid
            .filter(d => d.state)
            .sort((a,b) => a.step - b.step);
        active.forEach(d => model.add(d.note));
        model.close();
        model.model();
        model.init();
        graph.update(model.graph());
    }
    this.train = train;
    this.play = async () =>{
        Tone.start();
        var step = 0;
        await wait(2000);
        this.playing = true;
        while(this.playing){
            let curr = d3.selectAll(`.step${step}`)
                .datum(function (d) {
                    d.data = d.data + 0.2;
                    return d;
                })
            update(curr);
            let notes = grid
                .filter(d => d.step == step)
                .filter(d => d.state)
            if(notes.length)
            {   
                let note = scale[7 - notes[0].note]
                synth.triggerAttackRelease(note, "8n");
            }
            await wait(400);
            curr.datum(function (d) {
                d.data = d.data - 0.2;
                return d;
            })
            update(curr);
            step = (step + 1) % steps;
        }
    }
    this.generate = async () => {
        this.playing = true;
        Tone.start();
        await wait(2000);
        while(this.playing){
            let newState = model.step();
            graph.update(model.graph());
            graph.highlight({curr: newState, next: model.next()})
            let note = scale[7 - newState];
            synth.triggerAttackRelease(note, "8n");
            await wait(400);
        }
    }
}


function temp() {
    const chain = new Markov();
    //selected midi file
    const midi = document.getElementById('midiSelect').value
    //available selected tracks
    const sel = [...document.querySelectorAll('#trackSelect input')
        .values()]
        .filter(node => node.checked)
        .map(node => node.id)
    //create a name for the model
    const mName = [midi, ...sel].reduce((acc, cur) =>{
        return (acc + cur.slice(0,3) + '...' + cur.slice(-3) + ":")
    }, '')
    // actual midi data of selected tracks
    const tracks = Midis[midi].tracks
        .filter(t => sel.includes(t.name))
    //temporary map to organize polyphony by timestamp
    //this map is actually way reusable should not be a local
    const ts = tracksToMapByAttr(tracks, 'ticks')
    //keys sorted by start time
    const skeys = [...ts.keys()].sort((a,b) => a - b)
    // here we could get lots of data about the sequence
    // note/chord transitions, num notes, avg velocities 
    // its all right here.
    skeys.forEach((key) => {
        //sort midi notes so hashes collide eg [33, 35] = [35, 33]
        const step = ts.get(key).sort((a,b) => a.midi - b.midi)
        //get duration data for step
        //const duration = step.reduce((avg,note) => avg += note.duration, 0) / step.length
        //pack poly notes into a big int
        const hash = step.reduce((h, v, i) => {
            return h |= BigInt(v.midi) << BigInt(i*8);
        }, 0n);
        chain.add(hash);
        //onset data can be done with a reduce instead of foreach above
        //add an acc and return curr time
        //return step[0].time;

    }, 0)
    chain.close();
    chain.model();
    chain.init();
      
    Models[mName] = chain;
    updateModels();
    //return chain;
}

function updateModels() {
    const m = d3.select("#models")
        .selectAll("div")
        .data(Object.keys(Models))
        .join("div")
        .html("");
    
    m.append("text")
        .text(d => d);
    m.append("button")
        .text("Play Markov Model")
        .attr("onclick", d => `demo("${d}")`);
    
}

function decodeBigInt (big) {
    const notes = [];
    for(let i = 0n; i < 64n; i += 8n) {
     const bignote = (big >> BigInt(i)) & BigInt(0xFF)
      if(bignote) {
        notes.push(Number(bignote))
      }
    }
    return notes;
}

async function demo (mname) {
    const markov = Models[mname];
    console.log(markov);
    const synth = new Tone.PolySynth(Tone.Synth, {
        envelope: {
            attack: 0.02,
            decay: 0.1,
            sustain: 0.3,
            release: 0.5,
        },
    }).toDestination();
    while(playing){
        const notes = decodeBigInt(markov.step())
        const freqs = notes.map(n => Tone.Frequency(n, "midi"))
        synth.triggerAttackRelease(
            freqs,
            "8n",
            Tone.now(),
            0.7
        );
        await wait(250)
    }
    synth.disconnect();
}

/*
async function loop(action, params){
    var i = params;
    while(playing){
        const tick = await wait(1000);
        i = action(i);
    }
    return i;
}


function recThen(){
    const time = Math.random()*1000;
    wait(time).then((value) => {
        if(playing){
            recThen();
        }
    })
}

function advance(settings){
    settings.step++;
    settings.step %= settings.length;
    return settings;
}

function runTextMarkovOnce (){
    //textMarkov.init();
    //draw row selction boundary
    //update prob bar
    //pick random number move meter
    //highlight selected prob and column
}
function updateTextModel(sequence){
    const seqArr = [...sequence]
    textMarkov.clear();
    const table = d3.select('#textChain')
    table.selectAll('rect.dtab')
        .attr('fill', 'lightgrey')
    table.selectAll('text.dtab')
        .text('--')
    seqArr.forEach(t => textMarkov.add(t));
    textMarkov.model();
    const newData = textMarkov.data();
    newData.forEach((item) => {
        const loc = d3
            .selectAll(`.row${item.transition[0]}.col${item.transition[1]}`)
        loc.select('text')
            .text(item.probability.toFixed(2));
        loc.select('rect')
            .attr('fill', d3.interpolateLab("steelblue", "tomato")(item.probability))
    })
}
*/
/*
function SVGGrid(size, svgId, legArr=false){
    // private data
    const sq = size;
    const parentSvg = svgId;
    const legend = legArr ? legArr : [];
    const textLayer = legArr ? true : false;
    const fontSize = 16;
    const colors = {
        legend: 'white',
        data: 'lightgrey',
        low: 'steelblue',
        high: 'tomato',
        text: 'black'
    }
    const array = new Array(sq**2).fill(0);

    // private methods
    const itoa = (i) => legend[i];
    const lerp = (percent) => {
        d3.interpolateLab(colors.low, colors.high)(percent)
    }
    const classify = (i) => {
        var str = ''
        if(legend.length){
            str += `row${itoa(row(i))} col${itoa(col(i))}`;
            str += col(i) && row(i) ? ' dtab' : '';
        } else {
            str+= `row${row(i)} col${col(i)} dtab`;
        }
        return str;
    }
    const rectFill = (i) => {
        var fill = colors.data;
        if(itoa(i)){
            var fill = col(i) && row(i) ? colors.data : colors.legend;
        }
        return fill;
    }
    const textFill = (i) => {
        return col(i) && row(i) ? '--' : itoa(col(i) || row(i));
    }
    const col = (i=null) => i == null ? sq : i % sq;
    const row = (i=null) => i == null ? sq : ~~(i/sq);
    const svg = d3.select(`#${parentSvg}`);
    const w = svg.attr('width');
    const h = svg.attr('height');
    const dx = w / col();
    const dy = h / row();
    const map = svg.selectAll("g")

    function init (){
        const temp = map.data(array)
            .join("g")
                .attr('transform', (d,i) => {
                    return `translate(${col(i)*dx}, ${row(i)*dy})`
                })
                .attr('class', (d,i) => classify(i))

        temp.append("rect")
            .attr('width', dx)
            .attr('height', dy)
            .attr('fill', (d,i) => rectFill(i))
            .attr('class', (d,i) => classify(i))
        if(textLayer){
            temp.append("text")
                .text((d,i) => textFill(i))
                .attr('fill', colors.text)
                .attr('font-size', fontSize)
                .attr('x', dx/2)
                .attr('y', dy/2)
                .attr('class', (d,i) => classify(i))
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
        }
    }
    this.labeled = () => itoa(0);
    this.selection = () => svg;
    this.grid = () => map;
    this.tiles = () => map.selectAll('rect');
    this.text = () => map.selectAll('text');
    this.data = () => svg.selectAll('.dtab');
    this.draw = () => init();
}
*/