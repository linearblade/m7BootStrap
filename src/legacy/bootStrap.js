/*
 * Copyright (c) 2025 m7.org
 * License: MTL-10 (see LICENSE.md)
 */
//var docRoot = "./";
//var frameworkInstall = 'framework/';
/*
  fw = new framework({c:'foo'},{base:'./'});
  //--------------------------------------------------------
  //NAME: loadCSS 
  //DESC: loads css intothe document.
  //ARGS: string|hash OR array of string|hash , opts {}
  //opts overrides passed. which overrides constructor base.
  //--------------------------------------------------------

  fw.loadCSS({href:'test.css', base:'overrides constructor'},{base:'overrides passed, and constructor'});
  fw.loadCSS("test.css", {base:'foo'});
  fw.loadCSS(["test.css"], {base:'foo'});
  //--------------------------------------------------------


  bs = new bootStrapper();
  //append elements to the dom presumable [js | css ] .. could be anything tho.
  bs.append({url: 'framework/lib/js/utilsGeneral.js', attrs:{load:function(){console.log('hello world')}},target:document.head, tag:'script' }) 
  bs.append('framework/lib/js/utilsGeneral.js', {target:document.head, tag:'script', attrs:{load:function(){console.log('hello world')}}});
  bs.append('framework/lib/js/utilsGeneral.js', {target:document.head, tag:'script'});

  //may be out dated. manually loads objects as css without need to specify.
  bs.loadCSS 
  
  //todo
  [ ] loadAsset : load an asset, and store it. action on it if desired.
  [ ] loadLib : load a library into the bs.lib object from remote source.
  [ ] document append
  [ ] document loadCSS
  [ ] construct/document loadJS
  [ ] run : runs a program to perform a series of actions.
*/


var assets;
var jsonMap = {};
var scriptLoader;
var fw;
var tester;
var startupConfig;
var dataManager ;
var urlParams;
var state = {};


/*parse the query string*/
(window.onpopstate = function () {
    var match,
        pl     = /\+/g,  // Regex for replacing addition symbol with a space
        search = /([^&=]+)=?([^&]*)/g,
        decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
        query  = window.location.search.substring(1);

    urlParams = {};
    while (match = search.exec(query))
       urlParams[decode(match[1])] = decode(match[2]);
})();


/*
  DESIRED FEATURES.
    -console loader.
    -load everything needed at start
    -run events
    -load page assets.

  CSS TODO:
    track css loaded. 
    css aliasing for quick load / unload
    unload css by ID
    url stripping of double slashes
    asynchronous loading? trigger events?
    https://stackoverflow.com/questions/32759272/how-to-load-css-asynchronously
  
*/


/*
  string
    src       : (absolute|relative) link
    keywords  : 'expands to a link'
  hash
    config      : a config file. no work required.
    src pointer : a pointer to a config. may require work.
	
  confs = ['./test.js', '/abs.js', {src: 'pointer.js', type:js|json,target:'variablename'},{an actual config hash'} ]
*/
var lib = {
    p : console.log,
    //printDoc: print
    app: {
	bootstrap:{
	    append:{},
	    remote:{
		wrapper:{}
	    },
	},
	load:{
	    process:{},
	    apply:{}
	}
    }
};

//print = console.log;
printDocument = print;
print = console.log;

   /*

      options (optional): An object containing any custom settings that you want to apply to the request. Some of the common options include:
      method: The HTTP method (e.g., GET, POST, PUT, DELETE, etc.).
      headers: An object containing headers to be sent along with the request.
      body: The body of the request, typically used with methods like POST or PUT.
      mode: The mode of the request (e.g., cors, no-cors, same-origin).
      credentials: The credentials policy (e.g., omit, same-origin, include).


      handier than using idiotic fetch promise syntax.
     */
lib.fetch =  function (url,opts,fetchOpts){
	let responseFunc, dataFunc, errorFunc,info;
	opts = lib.hash.merge(
	    {
		response:'text',
		data    : undefined,
		error   : undefined,
	    }, lib.hash.to(opts,'data')
	);
	responseFunc = (!opts.response ||opts.response =='text')?
	    function(response,info){return response.text();}:
	(
	    opts.response == 'json'?
		function(response,info){return response.json();}:
	    lib.func.get(opts.response)
	);

	dataFunc = !opts.data ?
	    function(data,info){console.log(data,info);}:
	lib.func.get(opts.data);
	errorFunc = !opts.error?
	    function(error,info){console.error('There has been a problem with your fetch operation:', error,info);}:
	lib.func.get(opts.error);
	info = {
	    url,
	    fetchOpts: fetchOpts,
	    opts: opts
	};
	fetch(url,fetchOpts)
	    .then(
		function(info){
		    return function(response){
			return responseFunc(response, info);
		    }
		}(info)
	    )
	    .then(
		function(info){
		    return function(data){
			return dataFunc(data,info);
		    }
		}(info)
	    )
	    .catch(
		function(info){
		    return function(error){
			return dataFunc(error,info);
		    }
		}(info)
	    );
	
	return;
};

//$SECTION -LIB.UTILS
lib.utils = (function(lib){
    function getDispatch(){return {};  }
    function isArray(arg) {
	if (typeof arg == 'object') {
	    return Array.isArray(arg);
	    //var criteria = arg.constructor.toString().match(/array/i);
	    //return (criteria !=null);
	}
	return false;
    };
    function toArrayold (list){
	if (!list)return [];
	return (isArray(list))?list:[list] ;
    }
    function toArray (list, split=undefined){
	if (!list)return [];
	if(isArray(list))return list;
	if (!isEmpty(split)  && typeof(list) =='string'){ //figure out what a regexp is
	    //console.log('list=',list, 'split=',split);
	    return list.split(split);
	}else {
	    return [list];
	}
    }

    function isHash (obj) {
	if(!obj) return false;
	if(Array.isArray(obj)) return false;
	if(!obj.hasOwnProperty('constructor') && obj.constructor != Object) return false;
	return true;
    }
    function toHash(obj, hotkey=undefined){
	let def = {};
	if (isHash(obj))return obj;
	if (!isEmpty(hotkey) &&  baseType(hotkey,'string'))def[hotkey] = obj;
	return def;

	if (!isHash(def) ) {
	    opts = def;
	    def = {};
	}
	if (isHash(obj))return merge(def,obj);
	if (!isHash(opts) &&  !isEmpty(opts) && baseType(opts,'string') )
	    opts = {hotkey: opts};
	
	if (!isEmpty(opts['hotkey']) &&  baseType(opts['hotkey'],'string')){
	    def[opts['hotkey']] = obj;
	}
	if (isHash(opts['def']))def = merge(opts.def, def);
	
	return def;
    }

    

    
    function hasKeys (obj, keys,opts={}){
	if (!isHash(obj))return 0;
	keys = toArray(keys);
	for (let i =0,key=keys[i];i<keys.length;key=keys[++i]){
	    if(!(key in obj))return 0;
	}
	return 1;
    }


    
    function isScalar(v){
	return (typeof(v) =='string' || typeof(v) =='number')?1:0;
    }
    
    function toString(v,opts){
	let rv = undefined;
	opts = opts===undefined?{}:baseType(opts, 'object')?opts:{force:opts};
	if(typeof(v) =='string' || typeof(v) =='number'){
	    rv = ""+v;
	    if (opts['lc'])rv=rv.toLowerCase();
	}else if  (opts['force']){
	    rv = "";
	}
	
	return rv;
    }


    function baseType (value,comp){
	comp = toArray(comp);
	
	if (comp.length){
	    for (let i =0, item=comp[i]; i<comp.length;item=comp[++i]){
		if (value === null)
		    if(item.toLowerCase() == 'null'){
			return true;
		    }else{
			return false;
		    }
		var type = typeof(value);
		if (type == 'object'){
		    if (Array.isArray(value))type= 'array';
		}

		//return (type == item.toLowerCase())?true:false;
		if (item.toLowerCase() == type)return true;
	    }
	    return false;
	}else {
	    if (value === null)return 'null';
	    var type = typeof(value);
	    if (type == 'object'){
		if (Array.isArray(value))return 'array';
	    }
	    return type;
	}
	
    }
	
    function isEmpty(value){
	return (typeof value === "undefined" || value === null || value === "");
    }

    
    function linkType (item,check = []){
	let type = undefined;
	check = toArray(check);
	if (isHash(item))type= "hash";
	else if (baseType(item,'string')){
	    //patt= new RegExp('^a',i);
	    if (item.match(/^\//))type= 'absolute';
	    else if (item.match(/^https?\:\/\//))type= 'url';
	    else type= 'relative';
	};
	
	if (check.length){
	    for (let  i=0; i < check.length;i++){
		if (type == check[i] )return 1;
	    }
	    return 0;
	}
	return type;
    }

    function deepCopy (inObject,opts = {}) {
	let outObject, value, key;
	opts = toHash(opts);
	
	if (typeof inObject !== "object" || inObject === null) {
	    return inObject // Return the value if inObject is not an object
	}


	if(opts['force'] != 1 && typeof inObject === "object" && !(inObject instanceof Element) && !isArray(inObject) && !isHash(inObject)){
            //console.log('not traversing, its probably a class '+inObject.constructor.name);
            return inObject; //(dont copy classes);                                                                                                                 
	}else {
	    //console.log('will try ' +inObject.constructor.name);
	}
	/*
	if (!inObject.constructor.name.match(/^Object$/i)){
	    console.log('not traversing '+inObject.constrcutor.name);
            return inObject; //(dont copy classes);
        }
	*/
	// Create an array or object to hold the values
	outObject = Array.isArray(inObject) ? [] : {};
	
	for (key in inObject) {
	    value = inObject[key];
	    // Recursively (deep) copy for nested objects, including arrays
	    if (value instanceof Element)outObject[key]=opts.dom ==1?deepCopy(value):value;
	    else outObject[key] = deepCopy(value);
	}
	
	return outObject;
    }

    function hashOr(keys, hash, def){
	let list = toArray(keys);
	for (k of list){ 
	    if (k in hash) return hash[k];
	}
	return def;
    }
    //this is my crack sauce way better version. adapted from perl hash merge, and improved.
    function merge(left , right,opts = undefined){
	
	if (!(isHash(left) && isHash(right))) return undefined;
	var left = deepCopy(left);
	var right = deepCopy(right);
	
	var hmap = {'array': 'a', 'object':'h','element':'e'};
	//(isHash(opts) && ('disp' in opts))?opts.disp:
	
	if ( typeof this.disp == 'undefined' ){
	    this.disp =  {
		hh: function (l,r){return merge(l,r,opts);},
		as: function (l,r){l.push(r); return l;},
		aa: function (l,r){return l.concat(r);},
		'default': function (l,r){return r;}
	    };
	}
	
	//var disp =merge.disp;
	var disp = ( isHash(opts) && ('disp' in opts) )?{...this.disp, ...opts.disp}:this.disp;
	for (var p in right){
	    let type = (left[p] instanceof Element)?'e':(
		hashOr(baseType(left[p]), hmap, 's') + '' +
		    (right[p] instanceof Element?'e':hashOr(baseType(right[p]),hmap,'s')  ));
	    //console.log(`basetype l=${baseType(left[p])} || r=${baseType(right[p])} type=${type} key=${p} iel=${left[p] instanceof Element} ier=${right[p] instanceof Element}`);
	    
	    if (!(type in disp)) type= 'default';
	    left[p]=disp[type](left[p],right[p]);
	    
	}
	return left;
    }

    function hashStrip(rec, opts)  {
	if (!isHash(rec) ) return rec;
	let nRec = {};
	Object.keys(rec).forEach( (k,index) => {
	    if (rec[k] ===undefined)return;
	    nRec[k] = rec[k];
	});
	return nRec;
    };

    /*this may not work properly in all cases if you want to use it with objects, 
      even with apply(), unless you know what type of function your getting*/
    function getFunction(f,dummy=0){
	if(f){


            if (typeof(f) == "function"){
		return (f);
            }else if(window[f]){
		return (window[f]);
            }else if(typeof f =='string')  {
		let parts = f.split(".");
		let root = parts.length?parts.shift():undefined;
		if (parts.length  && window[root]){
		    let t = window[root];
		    for(let i = 0; i < parts.length; i++) {
			if (t[parts[i]]){
			    t = t[parts[i]];
			}else {
			    t=undefined;break;
			}
		    }
		    //let t = lib.hash.get(window[root],parts);
		    if (baseType(t, 'function'))return t;
		}
		    
	    }
	}

	return dummy?function () {}:undefined;
	return undefined;

    }


    function lc(v,fuckit=0){
	if (!isScalar(v) && !fuckit)return undefined;
	return ( (""+v).toLowerCase() );
    }
    


    function stripComments(data,opts){
	let cleaned = data;;
	opts = toHash(opts,'strip'); if(!opts['strip'])opts['strip'] = 1;
	opts['strip'] = toString(opts['strip']);
	if (opts['strip'].match(/1|a|m/i))
	    cleaned = data.replace( /\/\*[.\s\S]*?\*\//g, ""); // strip multi line
        if (opts['strip'].match(/1|a|s/i))
	    cleaned = cleaned.replace(/\/\/.*/g, ""); //strip single line
	return cleaned;
    }

    function base64DecodeUnicode(str) {
	return decodeURIComponent(Array.from(atob(str)).map(c =>
	    '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''));
    }

    function base64EncodeUnicode(str) {
	return btoa(encodeURIComponent(str).replace(
	    /%([0-9A-F]{2})/g, 
	    (match, p1) => String.fromCharCode('0x' + p1))
		   );
    }
    
    function getDispatch(){
	return {
	    isArray : isArray,
	    toArray : toArray,
	    //toArray2 : toArray2,
	    isHash  : isHash,
	    toHash  : toHash,
	    //hashSet : hashSet,
	    hasKeys : hasKeys,
	    isScalar: isScalar,
	    toString: toString,
	    baseType: baseType,
	    isEmpty : isEmpty,
	    
	    hashStrip:hashStrip,
	    merge:merge,
	    deepCopy:deepCopy,
	    linkType:linkType,
	    hashOr:hashOr,
	    getFunction:getFunction,
	    stripComments: stripComments,
	    lc:lc,
	    base64: {
		decode: base64DecodeUnicode,
		encode: base64EncodeUnicode
	    }
	};
    }
    return getDispatch();
})();

lib.array = ( function(lib){


    function arraySubtract(list, exclude){
	list = lib.utils.toArray(list, /\s+/);
	list = list.slice();
	exclude = lib.utils.toArray(exclude, /\s+/);
	console.log(list,'ex',exclude);
	for (let ex of exclude){
            let index;
            while (-1 !== (index = list.indexOf(ex))){
		list.splice(index, 1);
            }
	}
	return list;

    }


    function arrayAppend(input, pre="",post=""){
	let list , output=[];
	if (!lib.utils.baseType(input, ["array","string","number"])) return undefined;
	input = lib.utils.toArray(input, /\s+/);

	for (let i=0; i<input.length;i++){
            output[i] = pre+input[i]+post;
	}
	return output;
    }
    // lib/array.js or wherever your utilities live
     function random(arr) {
	if (!Array.isArray(arr) || arr.length === 0) return null;
	const index = Math.floor(Math.random() * arr.length);
	return arr[index];
    }
    function getDispatch(){
	return {
	    append:arrayAppend,
	    subtract: arraySubtract,
	    is : lib.utils.isArray,
	    to : lib.utils.toArray,
	    random : random
    	};
    }
    return getDispatch();
})(lib);


//$SECTION -LIB.EVENT
lib.event = (   function(lib){
    function setEventListeners(events){
	events = lib.utils.toArray(events);
	console.log('setting event listeners');
	if (!lib.utils.isArray(events)) return undefined ;
	for (i in events){
	    if (lib.utils.isArray(events[i])) events[i] = lib.args.parse(events[i], {},"target event handler options" );
	    console.log(events[i]);
            let e ;
            if (!lib.utils.isHash(events[i]))continue;
            e= lib.dom.getElement(events[i].target) || lib.dom.getElement(events[i].id);
            if (e){
		console.log('adding event for '+(events[i].id || events[i].target)+ ': ' +events[i].handler);
		//console.log(getFunction(events[i].handler));
		e.addEventListener(events[i].event, lib.utils.getFunction(events[i].handler), events[i].options);
            }
	}
    }
	
    function radioSet(list=[],event,on,off,options,ws){
	let events = [],eList = [];
	list = lib.utils.toArray(list);
	on = lib.utils.getFunction(on);
	console.log(`checking if on defined (${on})`);
	if (!on) return 0;
	off = lib.utils.getFunction(off);

	
	for (let i = 0, item=list[i]; i <list.length;item=list[++i]){
	    console.log(`i=${i} , item=${item}, event=${event}, on=${on}, off=${off}`);
	    let eventItem = undefined; //event,handler,options
	    let target,selector,wrapper;
	    if (lib.dom.isDom(item)){
		target = lib.dom.getElement(item);
	    }else if(lib.utils.isArray(item)){
		target = lib.dom.getElement(item[0]);
		selector = item[1];
	    }else if(lib.utils.isHash(item)){
		target = lib.dom.getElement(lib.hash.get(item,"t"));
		selector = lib.hash.get(item,"s");
	    }else if (lib.utils.baseType(item, 'string')){
		console.log(`item is a string ${item} ${i}`);
		target = lib.dom.getElement(item);
		selector = item;
	    }
	    //console.log(`trying ${selector}`);
	    if (!target) continue;
	    eList.push({target:target,selector:selector});
	    //console.log(`setting ${selector}`);
	    wrapper = function(eList, target, selector,ws){
		return function (e){
		    let pp = {
			selector : selector,
			target :target,
			ws : ws,
			current : {target:target, selector:selector}
		    };

		    on(e,pp);
		    if(!off) return;
		    for (i in eList){
			let le = eList[i];
			pp['current'] = le;
			if (e.target == le.target){
			    //console.log(`on ${pp.selector} ${e.target.id} == ${le}`);
			    //on(e,pp);
			}else {
			    //console.log(`off ${pp.selector} ${e.target.id} != ${le}`);
			    
			    off(e,pp);
			}
		    }
		}
	    };
	    eventItem = {
		target: target,
		event : event,
		handler : wrapper(eList, target,selector, ws),
		options : options
	    };
	    events.push(eventItem);
	}
	console.log(events);
	if (events.length)setEventListeners(events);

    }
    
    

    function getDispatch(){
	return {
	    set: setEventListeners,
	    radioSet: radioSet
	    
	};
    }
    return getDispatch();
})(lib);

    
//$SECTION -LIB.DOM
lib.dom = (   function(lib){
    function getDispatch(){return {};  }
    function isDom(o) {
	return(o instanceof Element);
    }


    function getElement(id){
	if(isDom(id)) return id;
	return document.getElementById(id);
    }

    function byId(id){
	return document.getElementById(id);
    }
    function removeElement( e ) {
	var e = getElement(e);
	if (!e) return undefined;
	e.parentNode.removeChild(e);
	return e;
    }

    function qs() {
	var match,
            pl     = /\+/g,  // Regex for replacing addition symbol with a space
	    search = /([^&=]+)=?([^&]*)/g,
	    decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
	    query  = window.location.search.substring(1);
	
	urlParams = {};
	while (match = search.exec(query))
	    urlParams[decode(match[1])] = decode(match[2]);
	return;
    }

    function insertAfter(newNode, existingNode) {
	existingNode.parentNode.insertBefore(newNode, existingNode.nextSibling);
    }

    function unset(e,attr){
	if(!(lib.dom.isDom(e) || attr)) return undefined;
	e.removeAttribute(attr);
	return;
    }
    //todo allow total data set upload later
    function set(e,attr,val){
        if(!(lib.dom.isDom(e) || attr)) return undefined;
	let m;

	if(m = attr.match(/^(set|add|remove|toggle)Class$/i)){
	    let lc = m[1].toLowerCase();
	    let map = {
		'set' : ()=>{e.classList.set(val)},
		'add' : ()=>{e.classList.add(val);},
		'remove' : ()=>{e.classList.remove(val);},
		'toggle' : ()=>{e.classList.remove(val);}
	    };
	    return map[lc]();
	}else if (m = attr.match(/^dataset(\.)?(.*)$/i)){
	    if (m[1]){
		lib.hash.set(e.dataset,m[2]);
		return lib.hash.get(e.dataset,m[2]);
	    }
	    else return undefined;
	}else if (m= attr.match(/^(tagName|value|name|text|textContent|innerHTML|type|href|src|disabled|selected|checked)$/i)){

	    let map= {
		"tagname" : "tagName",
		"value" : "value",
		"name" : "name",
		"text" : "text",
		"textcontent" : "textContent",
		"innerhtml" : "innerHTML",
		"type" : "type",
		"href" : "href",
		"src" : "src",
		"disabled":"disabled",
		"selected":"selected",
		"checked" : "checked"
	    };
	    let lc = m[1].toLowerCase();
	    return  e[(lc in map)?map[lc]:m[1]] = val; 

	    if (m[1].toLowerCase() =='tagname') m[1] = "tagName"; //this probably doesnt work, but may some year in the future.
	    else if (m[1].toLowerCase() =='textcontent') m[1] = "textContent";
	    else if (m[1].toLowerCase() =='innerhtml') m[1] = "innerHTML";
	    else if (m[1].toLowerCase() =='value') m[1] = "value";
	    else if (m[1].toLowerCase() =='type') m[1] = "type";
	    else if (m[1].toLowerCase() =='name') m[1] = "name";
	    else if (m[1].toLowerCase() =='text') m[1] = "text";
	    else if (m[1].toLowerCase() =='href') m[1] = "href";
	    return e[m[1]] = val;
	    
        }else{
	    if(lib.array.to(attr,'.').length>1)	lib.hash.legacySet(e,attr,val);
	    else e.setAttribute(attr,val);
	    return e.getAttribute(attr,val);
        }

    }
    
    //work in progress. collect all the carvout properties , and make it insenstive , fixing for later.
    function get(e,attr){
        if(!lib.dom.isDom(e)) return undefined;
	if(!attr)return e;
	if (m = attr.match(/^dataset(\.)?(.*)$/i)){
	    if (m[1])return lib.hash.get(e.dataset,m[2]);
	    return e.dataset;
	}else if (m= attr.match(/^(tagName|value|name|text|textContent|innerHTML|type)$/)){
	    return e[m[1]];
        }else{
	    return e.getAttribute(attr);
        }
	
        return 1;

    }

    // Takes a nebulous target and attempts to squeeze a DOM node from it
    function attemptDom(input, barf = false) {
	// Check if input is empty or already a DOM element
	let node = lib.utils.isEmpty(input) ? null :                                // Handle empty input
            lib.dom.is(input) ? input :                                      // It's already a DOM element
            typeof input === 'object' && input.target ? input.target :       // Likely an event handler
            lib.dom.getElement(input) ?? document.querySelector(input);      // Try getting DOM or query selector

	// Optionally throw an error if not found
	if (!node && barf) {
            throw Error(`cannot derive a dom node from :`,input);
        }

	return node;
    }

    
    function getDispatch(){
	return {
	    get: get,
	    set: set,
	    is: isDom,
	    attempt: attemptDom,
	    isDom: isDom,
	    getElement: getElement,
	    byId: byId,
	    removeElement: removeElement,
	    qs:qs,
	    insertAfter:insertAfter,
	    
	};
    }
    return getDispatch();


})(lib);


//$SECTION -LIB.DOM.CREATE
lib.dom.create = (function(lib){
    function js(url, attrs){
	if (!lib.utils.isHash(attrs)) attrs = {};
	attrs = lib.utils.merge({
	    'async': true,
	    type: "text/javascript",
	    src: url
	}, attrs);
	return element("script", attrs, undefined);
	
    }
    
    function css(url, attrs){
	if (!lib.utils.isHash(attrs)) attrs = {};
	attrs = lib.utils.merge({
	    rel: "stylesheet",
	    type: "text/css",
	    href: url
	}, attrs);
	return element("link", attrs, undefined);
    }
    
    function element(tag, attrs={}, content=undefined){
	var e =document.createElement(tag);
	//console.log('CREATE ELEMENT ATTRS', attrs);
	if (!this.special){
	    let eventHandler = function (e,key,value){
		let fun = lib.utils.getFunction(value);
		if (fun)e.addEventListener(key, fun ,true);
	    };
	    this.special = {
		load  : eventHandler,
		error : eventHandler,
		click : eventHandler
	    };
	    
	}
	if (!lib.utils.isHash(attrs)) attrs = {};

	for (let key of Object.keys(attrs)){
	    if (this.special[lib.utils.lc(key)]){
		this.special[lib.utils.lc(key)](e,key,attrs[key]);
	    }else {
		e.setAttribute(key, attrs[key]);
	    }
	}
	return e;
    }
    
    function getDispatch(){
	return {
	    css:css,
	    link:css,
	    js:js,
	    element:element
	};
    }
    return getDispatch();


})(lib);

lib.args = (function(lib){
    //takes a list and a list of names, and returns them as a hash.
    //the last arg is the hash,
    //parseArgs(args, {req: " ", opt:" ",arg: 1|0,pop:1|0}
    function parse(args, def, opts){
	let out = {}, defOpts = {pop:1, arg:0};
	opts = lib.utils.merge(defOpts, lib.utils.toHash(opts,'parms'));
	def = lib.utils.toHash(def);
	args = lib.utils.toArray(slice(args)); //convert potential 'Arguments' to array
	parms = lib.utils.toArray(opts['parms'], /\s+/);
	req = lib.utils.toArray(opts['req'], /\s+/);	
	//console.log('>>',parms,req,opts['req'],'<<');
	out = (opts.pop && lib.utils.baseType(args[args.length-1],'object') && !lib.dom.isDom(args[args.length-1]))?args.pop():{};
	out = lib.utils.merge(def,out);
	for (let i =0; i < parms.length; i++){
	    let key = parms[i], value;
	    if (i > args.length-1)break;
	    value = args[i];
	    lib.hash.set(out, key, value);
	}
	for (let i =0; i < req.length; i++){
	    let key = req[i];
	    if (!(key in out))return undefined;
	}
	return out;
	
    }
    //performs array slice on arguments object
    function slice(args,a,b=undefined){
	return Array.prototype.slice.call(args).slice(a,b);
    }

    function isArguments( item ) {
	return Object.prototype.toString.call( item ) === '[object Arguments]';
    }
    
    var disp = {
	'slice' : slice,
	'parse' : parse,
	'isArguments' : isArguments
	
    };
    return disp;
})(lib);


//$SECTION -LIB.DOM.APPEND
lib.dom.append= (function(lib){
    var disp = {
	'before' : function(e, target){ target.insertBefore(e, target)  },
	'after' : function(e, target){ lib.dom.insertAfter(e, target)  },
	'prepend' : function(e, target){ target.insertBefore(e, target.childNodes[0])  },
	'append' : function(e, target){ target.appendChild(e) },
	
    };
    return disp;
})(lib);

//$SECTION -LIB.APP.BOOTSTRAP.APPEND
lib.app.bootstrap.append = (function(lib){

    let mScript= function (item,opts={}){
	var url = lib.utils.linkType(item.url,'relative')?(item.base?item.base:"")+item.url:item.url;
        return lib.dom.create.js(url, item['attrs']);
    };
    let mCss= function (item,opts={}){
	var url = lib.utils.linkType(item.url,'relative')?(item.base?item.base:"")+item.url:item.url;
        return lib.dom.create.css(url, item['attrs']);
    };
    let def = function(item,opts={}){
	//console.log('in default',item);
        return lib.dom.create.element(item.tag, item['attrs'],item.content);
    }
    var disp = {
        script : mScript,
        js : mScript,
        css :  mCss,
	link :  mCss,
        'default': def
    };
    return disp;
})(lib);
//$SECTION -LIB.APP.BOOTSTRAP.PLUGIN
lib.app.bootstrap.plugin = (function(lib){


    function registerLib(bs, target,opts){
	if(opts.debug)console.log('in register func', arguments);
	let plugin,regList,pkg;
	plugin = lib.hash.get(lib,target);
	if (!plugin.__REGISTER__){
	    console.log(`no registration information found for plugin ${target}`);
	    return ;
	}
	pkg =opts['plugindst']?opts.dst:lib.utils.toString(plugin['__PLUGIN_PACKAGE__'], {force:1});

	//(!plugin['__PACKAGE__'])?plugin.__PACKAGE__:"";
	
	regList = lib.utils.toArray(plugin.__REGISTER__, /\s+/);
	for (item of regList){
	    console.log(`registering ${item}`);
	    if (!(item in plugin)){
		console.log(`object not found in lib ${target}`);
		continue;
	    }
	    let pluginPath = (lib.utils.isEmpty(pkg)?'':pkg+'.')+item;
	    registerClass(bs,plugin[item], pluginPath,opts);
	    //lib.hash.set(bs.plugins, pluginPath, pluginObj);
	}
	
	
    }
    function registerClass(bs, cls, target,opts){
	console.log('registering class', arguments);

	if (typeof cls !=='function'){
	    console.log('unable to register class, not a function');
	    return;
	}
	let obj = new cls(bs,opts);
	lib.hash.set(bs.plugins, target, obj);
    }

    
    /*
    let mScript= function (item,opts={}){
	var url = lib.utils.linkType(item.url,'relative')?(item.base?item.base:"")+item.url:item.url;
        return lib.dom.create.js(url, item['attrs']);
    };
    let mCss= function (item,opts={}){
	var url = lib.utils.linkType(item.url,'relative')?(item.base?item.base:"")+item.url:item.url;
        return lib.dom.create.css(url, item['attrs']);
    };
    let def = function(item,opts={}){
	//console.log('in default',item);
        return lib.dom.create.element(item.tag, item['attrs'],item.content);
    }*/
    var disp = {
	registerLib:registerLib,
	registerClass:registerClass
    };
    return disp;
})(lib);


lib.app.bootstrap.remote.wrapper = (function(lib){


    function setLibExec(obj,opts){
	let [src,dst,doEval,load,action] = lib.hash.expand(opts, "src dst eval load action");
	return function (req,opts){
	    let ev,text;
	    text  = req.responseText;
	    if (opts['debug'] ==1)console.log(`inside setlibExec: ${action}`, opts);
	    ev = lib.js.exec(text, {exec:1, eval:doEval?doEval:'indirect'});
	    lib.utils.getFunction(load,1)(req,opts);

	}
	
    }

    function setLib(obj,opts){
	let [src,dst,doEval,load,action] = lib.hash.expand(opts, "src dst eval load action");
	return function (req,opts){
	    let ev,text,target;
	    text  = req.responseText;
	    //console.log('inside setlib: ' +action, opts);

	    ev = lib.js.execLib(text, opts);
	    if (opts['debug']){
		console.log(ev, lib.hash.get(ev,'__PACKAGE__'));
		console.log(text);
	    }
	    //if(action == 'lib')lib.hash.set(lib,dst?dst:lib.hash.get(ev,'__PACKAGE__')?ev.__PACKAGE__:src, ev);

	    if(action.match(/lib|plugin/i)){

		target = dst?dst:lib.hash.get(ev,'__PACKAGE__')?ev.__PACKAGE__:src;
		console.log(`dst =${dst}, package=${ev.__PACKAGE__}, src=${src}`);
		let c = lib.hash.get(lib,target);
		let d = {
		    "l": (l,r) =>{return lib.utils.merge(l,r);},
		    "r": (l,r) =>{return lib.utils.merge(r,l);},
		    "o": (l,r) =>{return r;},
		};
		let behavior = (opts['merge'] &&  opts['merge'] in d)?opts['merge']:'l';		
		if (opts['debug'])console.log(`setting ${target} with behavior ${behavior}`, d[behavior](lib.utils.isHash(c)?c:{},ev));

		if(action.match(/plugin/i ))target='plugin.'+target;
		lib.hash.set(lib,target, d[behavior](lib.utils.isHash(c)?c:{}, ev));
		lib.app.bootstrap.plugin.registerLib(obj,target,opts);


	    }
	    lib.utils.getFunction(load,1)(req,opts,target); // used to be outside if


	}
    }

    function storeJson(obj,opts){
	let [src,dst,doEval,load,action] = lib.hash.expand(opts, "src dst eval load action");
	return function (req,opts){
	    let id = opts['id'] || dst;
	    //console.log(`storing as json (${dst})`);
	    //obj.assets[id]=(id && req && ('responseText' in req))?lib.json.decode(req.responseText): undefined;
	    if(opts.debug)console.log(opts);
	    if (id && req && ('responseText' in req)){
		let rText = opts['strip']?lib.utils.stripComments(req.responseText,opts):req.responseText;
		lib.hash.set(obj.assets,id, lib.json.decode( rText,  {errText:opts['url'],errSpan:20}) );
	    }
	    lib.utils.getFunction(load,1)(req,opts);
	}
	
    }

    function storeText(obj,opts){
	let [src,dst,doEval,load,action] = lib.hash.expand(opts, "src dst eval load action");
	return function (req,opts){
	    let id = opts['id'] || dst;
	    console.log(`storing as text  (${dst}) ,`,id,'<<');
	    //obj.assets[id]=(id && req && ('responseText' in req))?req.responseText: undefined;
	    if (id && req && ('responseText' in req))lib.hash.set(obj.assets,id,req.responseText);
	    lib.utils.getFunction(load,1)(req,opts);
	}

    }
    function attachText(obj,opts){
	let [src,dst,doEval,load,action] = lib.hash.expand(opts, "src dst eval load action");
	return function (req,opts){
	    let id = opts['id'] || dst;
	    console.log(`storing as text  (${dst}) ,`,id,'<<');
	    //obj.assets[id]=(id && req && ('responseText' in req))?req.responseText: undefined;
	    if (id && req && ('responseText' in req)){
		//lib.hash.set(obj.assets,id,req.responseText);
		let e;
		if (e= lib.dom.byId(id)){
		    let result = ""
		    if (opts.attachtype){
			e.innerHTML = (opts.attachtype+"").match(/pre/i)?(req.responseText+e.innerHTML):(e.innerHTML+req.responseText);
		    }else {
			e.innerHTML=req.responseText;
		    }
		}
	    
	    }
	    lib.utils.getFunction(load,1)(req,opts);
	}

    }
    function storeRequest(obj,opts){
	let [src,dst,doEval,load,action,id] = lib.hash.expand(opts, "src dst eval load action dst");
	return function (req,opts){
	    //console.log(`storing as request  (${dst})`);
	    //obj.assets[dst]=(dst && req)?req:undefined;
	    if (dst && req)lib.hash.set(obj.assets,dst,req);
	    lib.utils.getFunction(load,1)(req,opts);
	}
	
    }
    
    function def(obj,opts){
	let [src,dst,doEval,load,action,id] = lib.hash.expand(opts, "src dst eval load action dst");
	return function(req,id){
	    lib.utils.getFunction(load,1)(req,id);
	}
    }
    
	
    var disp = {
	lib:setLib,
	plugin:setLib,
	exec:setLibExec,
	json:storeJson,
	text:storeText,
	req:storeRequest,
	request:storeRequest,
	attach:attachText,
	def:def
    };
    return disp;
	

})(lib);



lib.js =  (function(lib){
    function toLib(text,opts){
	let rv;
	rv = exec(text, opts);
	lib.hash.set(lib,module, rv);

    };

    //makes a dispatch table to collect exports.
    function _makeDispatch(exp,dname='getDispatch'){
	let t = [],text="";
	text = "function "+dname+"(){return {";
	exp =exp?lib.utils.toArray(exp, " " ):[];
	for (let i=0; i < exp.length;i++){
	    t.push( exp[i] +' : '+exp[i]);
	};
	t.push ('__PACKAGE__ :(typeof __PACKAGE__ !== "undefined")? __PACKAGE__:undefined');
	//console.log(t);
	text =  text + t.join(',\n') + '};}';
	//console.log(text);
	return text;
    }

    /*
      parms : parameters of closure
      args : arguments to pass to closure
     */
    function _makeClosure(text, parms=undefined, args=undefined,opts){
	let prepend, postpend,rv;
	opts = lib.args.parse(arguments,{ 'text':"", parms:"",args:""}, "text parms args"); 
        prepend = "(function("+lib.utils.toString(opts.parms,1)+"){";
	postpend = '})('+lib.utils.toString(opts.args,1)+')';
	rv = [prepend , lib.utils.toString(opts.text,1) , postpend].join("\n");
	return rv;
	
    }
    function _makeDispatchCall(name='getDispatch'){
	return "return "+name+"();";
    }

    /*
      text : the code to build the closure around.
      dfunc : insert exporter function, requires export and dname
      dname: exporter function name, requires dname
      dcall : call exporter function
      export : list of exports, space delimited, or array of
      parms : parameters to pass to closure
      args : call the closure with these arguments

      {
        func: 1 | "foo" : if its 1, will use the default name. if its a non empty string, use that. if 0 or undefined, will not prepend exporter function.
	call : 1 :calls exporter function | 0: does not call an exporter function.
	name : name of exporter function.
	
      }
     */
    function dispatchClosure(text, opts){
	let dFunc, dCall,code,exports;
	opts = lib.args.parse(arguments,{ 'text':undefined, dfunc:1, dcall:1, dname:'getDispatch', "export":"",parms:"lib",args:"lib"}, "text export parms args");
	exports = lib.utils.isEmpty(opts['export'])?[]:lib.utils.toArray(opts['export']);
	dFunc = ('dfunc' in opts  )? _makeDispatch(exports,opts['dname']) :""; //&& exports.length
	dCall = ('dcall' in opts)? _makeDispatchCall(opts['dname']):"";
	//code = [dFunc, text,dCall].join("\n");
	if(exports.length){
	    //console.log('FOUND EXPORT',exports);
	}
	//code = [text,dFunc,dCall].join("\n");
	code = [dFunc,text,dCall].join("\n");
	//console.log(dFunc);
	return _makeClosure(code,opts['parms'],opts['args'] );
	
    }

    /*
      1. build a closure or not.
      2. determine eval mode.
      3. eval it.
      4. return the result.

      closure = 1|0
      verbose = 1|0
      dispatchOpts = ...
      eval = "direct|indirect"
      exec(text, "indirect", {export:" "})
      exec(text, modules);
     */
    //$exec
    function exec(text,opts){
	opts = lib.args.parse(arguments,{ 'text':undefined, verbose:1,eval:'direct'}, "text eval verbose");
	//console.log('eval is '+opts.eval + ' '+opts.exec);
	if (opts.exec){
	    code = opts.text;
	}else{
	    code = dispatchClosure(opts.text,opts);
	}
	//if(opts['debug'])console.log(code);
	//console.log(opts);
	let ev = undefined;
	let errorHeader = "ERROR:\nfile:"+opts['base']+opts['desc']+"\n";
        try {
	    ev = (lib.utils.toString(opts.eval,{lc:1, force:1}) == 'indirect')?(0,eval)(code):eval(code);
	    //console.log('here');
	    //console.log(ev);
        } catch (e) {
	    console.log(errorHeader,e);
	    eval('try { ' + code + ' } catch(err) { console.log("!!!>>"+err); }');
            if (e instanceof SyntaxError) { //  && opts.verbose
                //console.log(e.message,e.stack);
            }else {
		//console.log('there was an unspecified error loading this file ',e);
	    }
        }
	return ev;

    }

    /* 
       front end with presets for loading a lib.
       execLib(text, "exports go here");
       */
    function execLib(text, exports, opts){
	opts = lib.args.parse(arguments,{ 'text':undefined, verbose:1,eval:'indirect'}, "text export");
	opts = lib.utils.merge(opts, {exec:0});
	//console.log(`OPTS :`,opts);
	return exec(opts.text, opts);
    }

    var disp = {
        lib: toLib,
        exec: exec,
	execLib: execLib,
	_dispatch:_makeDispatch,
	_closure: _makeClosure,
	dispatchClosure:dispatchClosure,
	
        default: exec
    };
    return disp;


})(lib);



lib.app.load.apply = (function(lib){
    let toJSON = function(req){
        obj.assets[opts.id] = lib.json.decode(req.responseText);
	
    };
    let toText = function(req){
	return req.responseText;
    };
    let def = function(req){
	return req;
    };

    var disp = {
	json: toJSON,
	text: toText,
	default: def
    };
    return disp;
	

})(lib);

//$lib.sync.controller
lib.sync = (function(lib){
    class syncLoader {
	constructor(opts = {}) {

	    opts = lib.args.parse(arguments,{ 'load':undefined}, "load prepend require"); //lib.args.slice(arguments,1)
	    this.controller = {check:{}, run:{},lock:undefined};
	    this.onLoad = lib.utils.getFunction(opts.load);
	    this.prepend = opts.prepend;

	    this.require(opts.require);

	}

	require(id){
	    id = lib.utils.toArray(id, /\s+/);
	    for (let i in id){
		this.controller.check[id[i]] = 1;
	    }
	    return 1;
	}
	set(id) {
	    //console.log('>>setting '+id,this.controller);
	    if (!(id in this.controller.check))return 0;
	    this.controller.run[id]= 1;
	    if (this.loaded()){
		if (!lib.utils.isEmpty(this.controller.lock)) {
		    //console.log('locked by' + id);
		    return 0;
		} //fix later with promise
                this.controller.lock=id;
		//console.log('>>MADE HERE');
		lib.utils.getFunction(this.onLoad,1)(this.prepend, id, ...lib.args.slice(arguments,1));
		return 1;
	    }
	    return 0;
	}
	
	loaded (id=undefined){
	    if (id){
		if (!(id in this.controller.check))return 0;
		return  (this.controller.run[id] == 1)?1:0;
	    }
	    for (k in this.controller.check){
                if (this.controller.run[k] !=1){
                    //console.log('returning from id:'+k+' / '+this.controller.run[k]);
		    return 0;
                }
            }
	    return 1;
	    
	}

	//require an id, and run it when its triggered.
	wrapper(id,itemHandler) {
	    this.require(id);
	    let obj = this;
	    return function(){
		//console.log('firing wrapper with ',arguments);
		lib.utils.getFunction(itemHandler,1)(...arguments);
		obj.set(id);
	    }
	}
	
	
    }

    var disp = {
	controller : syncLoader
    };
    return disp;
})(lib);

lib.func =  (function(lib){
    function wrapper(fun){
	fun = lib.utils.getFunction(fun);
	if(!fun)return undefined;
	args = lib.args.slice(arguments,1);
	return  function (){
	    let fullArgs = lib.args.slice(arguments).concat( args);
	    fun(...fullArgs);
	}
    }

    /* in progress. check pre/postWrap for now
      chain("foo"|foo, ...args);
      chain("foo bar"|[foo,bar], ...args);
      chain({f:funs, e:err,t:test,a:args      });
      chain("istring lower, match", "$rv");
    */


    /*
      preWrap(funs, args); postWrap(funs, args);
      wraps a list of functions with predefined vars, returns a wrapper
      to be called with additional arguments, (usually an event Handler)
      ex: req.onclick = preWrap("writeComment updateValue", {})(this);
          addEventListener('click',preWrap("writeComment updateValue",{}););

      note: eventually after figuring out an intuitive parameter format,
            all will be merged into 'chain'
     */

    
    function postWrap(funs){
	let args,wrap;
	args = lib.args.slice(arguments,1);
	funs = lib.array.to(funs,/\s+/);
	wrap = function(){
	    let rv = undefined,name=undefined;
	    for (fun of funs){
		//name=(typeof(fun) == 'string')?fun:"anon fucc"
		let fullArgs = lib.args.slice(arguments).concat( args);
		fun = lib.utils.getFunction(fun);
		if(!fun)return undefined;

		rv = fun(...fullArgs);
            }
	    //console.log('PW returning',rv,name);
	    return rv;
	}
	return wrap;
    }
    
    function preWrap(funs){
	let args,wrap;
	args = lib.args.slice(arguments,1);
	funs = lib.array.to(funs,/\s+/);
	wrap = function(){
	    let  rv=undefined;
	    for (fun of funs){
		//let fullArgs = lib.args.slice(arguments).concat( args);
		let fullArgs = args.concat( lib.args.slice(arguments));
		fun = lib.utils.getFunction(fun);
		if(!fun)return undefined;

		rv = fun(...fullArgs);
            }
	    return rv;
	}
	return wrap;
    }


    //clean this up to provide better info
    function name(){
	let stack = new Error().stack,
            caller = stack.split('\n')[2].trim();
	return caller;
	
    }

    
    var disp = {
	name : name,
	wrapper : wrapper,
	postWrap: postWrap,
	preWrap: preWrap,
	get : lib.utils.getFunction
    };
    return disp;
})(lib);
    
lib._http = (function(lib){
    let get = function(url, opts){
	opts = lib.utils.toHash(opts);
	if (opts.debug)console.log('opts', opts);
	let req = new XMLHttpRequest();
	let method = lib.hash.get(opts,'method',"GET") ;
	//4/16/24 -- added with credentials.
	if(opts['credentials'] == true){
	    req.open(method,url,true);
	    req.withCredentials = true;
	}else req.open(method,url);
	req.onreadystatechange = function () {
	    if(req.readyState === XMLHttpRequest.DONE){
		//console.log('received data. status='+req.status, opts);
		if (req.status >=400)lib.utils.getFunction(opts['error'],1)(req);
		else lib.utils.getFunction(opts['load'],1)(req);		

		//if (lib.utils.getFunction(opts['load'])) opts['load'](req);
		/*
		if (req.status === 200) {
		    console.log('received data');
		    success(req);
		}else{
		    console.log('error getting data');
		    failure(req);
		}*/
	    }
	};
	req.send(lib.hash.get(opts,'body'));
    }
    function _request(url, opts){
	opts = lib.utils.toHash(opts);
	//if (opts.debug)console.log('opts', opts);
	let req = new XMLHttpRequest();
	
	let method = lib.hash.get(opts,'method', "GET") ;
	let headers = lib.utils.toArray(opts.header);
	//4/16/24 -- added with credentials.
	if(opts['credentials'] == true){
	    req.open(method,url,true);
	    req.withCredentials = true;
	}else req.open(method,url);
	
	if(opts.urlencoded)req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
	for (i of headers){
	    if (lib.hash.is(i)){
		req.setRequestHeader(i['name'],i['value']);
	    }
	}
	req.request={
	    url: url,
	    body: lib.hash.get(opts,'body')
	};
	req.onreadystatechange = function () {
	    if(req.readyState === XMLHttpRequest.DONE){
		//console.log('received data. status='+req.status, opts);
		if(opts.json==1)req.jsonData = lib.json.parse(req.responseText+"");
		if (req.status >=400)lib.utils.getFunction(opts['error'],1)(req);
		else lib.utils.getFunction(opts['load'],1)(req);		
	    }
	};
	if (opts.debug ){
	    console.log('sending',opts,req);
	}
	req.send(lib.hash.get(opts,'body'));
    }
    function post(url,opts){
	opts = lib.utils.toHash(opts);
	opts.method='POST';
	return _request(url,opts);
    }
    var disp = {
	get: get,
	post: post,
	request: _request
	
    };
    return disp;
})(lib);




lib.json = (function(lib){

    //decodes text into obj.
    function decode(text, opts){
	let rec;
	opts = lib.args.parse(arguments,{verbose:1, text:undefined,errSpan:10}, "text"); 
	try {
            rec = JSON.parse(opts.text);
        } catch (e) {
            if (opts.verbose && e instanceof SyntaxError) {
		let rem = e.message.substr(e.message.toLowerCase().indexOf("position ") );
		let patt = /position (\d+)/i;
		//e.message.substr(e.message.toLowerCase().indexOf("position ") ).
                console.log(`error parsing json ${opts['errText']?['(',opts['errText'],')'].join(''):''}\n`, e.message,rem);
		let pos = 0;
		if (match =  patt.exec( e.message)){
		    if (match.length > 1)
			pos = match[1];
		}
		if (!lib.utils.isEmpty(pos)){
		    //console.log(`textlengh=${text.length}, pos=${pos}`);
		    console.log(text.substr(pos-opts.errSpan>0?pos-opts.errSpan:0, opts.errSpan*2)); //pos+10<text.length?pos+10:undefined
		}

		//text.substr(
            }
            rec = undefined;
        }
	return rec;
    }

    //encodes a json string from an object.
    function encode(obj, opts){
	let text;
	opts = lib.args.parse(lib.args.slice(arguments,1),{verbose:1, obj:undefined}, ""); 
	try {
            text = JSON.stringify(obj);
        } catch (e) {
            if (opts.verbose && e instanceof SyntaxError) {
                console.log("error encoding json\n", e.message);
            }
            text = undefined;
        }
	return text;
    }
    
    var disp = {
	stringify: encode,
	encode: encode,
	decode: decode,
	parse: decode,

    };
    return disp;
    

})(lib);



lib.hash = (function(lib){
    //console.log('installing lib.hash');
    /*lifted from medium because I'm lazy to write my own.
      https://medium.com/javascript-in-plain-english/how-to-deep-copy-objects-and-arrays-in-javascript-7c911359b089
      WTF is with people not using semi colons.
    */
    function deepCopy(inObject,opts={}) {
	let outObject, value, key;
	opts = lib.utils.toHash(opts);
	if (typeof inObject !== "object" || inObject === null) {
            return inObject // Return the value if inObject is not an object 
	}
	//if (isHash(obj)!inObject.constructor.name.match(/^Object$/i)){ 
	if(opts['force'] != 1 && typeof inObject === "object" && !(inObject instanceof Element) && !lib.utils.isArray(inObject) && !lib.utils.isHash(inObject)){
            console.log('not traversing, its probably a class '+inObject.constructor.name);
            return inObject; //(dont copy classes);
	}else {
            //console.log('will try ' +inObject.constructor.name);
	}
	/*
	  if(typeof inObject === "object" && !isDom(inObject) && !isArray(inObj) && !isHash(inObj)){ 
	  console.log('not traversing, its probably a class '+inObject.constructor.name);
	  return inObject; //(dont copy classes); 
	  }
	*/
	// Create an array or object to hold the values

        
	outObject = Array.isArray(inObject) ? [] : {};

	for (key in inObject) {
            value = inObject[key];
            // Recursively (deep) copy for nested objects, including arrays 
	    outObject[key] = deepCopy(value);
	}

	return outObject;
    }


    function hashOr(k, hash, def){
	if (k in hash) return hash[k];
	return def;
    }

    function merge (left , right,opts = undefined){

	if (!( lib.utils.isHash(left) && lib.utils.isHash(right))) return undefined;
	var left = deepCopy(left);
	var right = deepCopy(right);

	var hmap = {'array': 'a', 'object':'h'};
	//(isHash(opts) && ('disp' in opts))?opts.disp:
	if ( typeof merge.disp == 'undefined' ){
            merge.disp =  {
		hh: function (l,r){return merge(l,r,opts);},
		as: function (l,r){l.push(r); return l;},
		aa: function (l,r){return l.concat(r);},
		'default': function (l,r){return r;}
            };
	}

	//var disp =merge.disp;
	var disp = ( lib.utils.isHash(opts) && ('disp' in opts) )?{...merge.disp, ...opts.disp}:merge.disp;
	for (var p in right){
            var type = hashOr(lib.utils.baseType(left[p]), hmap, 's') + '' + hashOr(lib.utils.baseType(right[p]),hmap,'s');
            //console.log(type+ " " +p) ; 
            if (!(type in disp)) type= 'default';
            left[p]=disp[type](left[p],right[p]);

	}
	return left;
    }



    
    function hashGet(E, prop, def=undefined){
	//convert prop to array
	//if (prop == 'runEvents')  console.log('getting ' + prop + 'def = '+def);
	
	if (lib.utils.baseType(E,'object')) {
            var parts =  lib.utils.toArray(prop,'.');
            if (parts){
		
		var ptr = E;
		for (var i =0; i < parts.length; i++){
                    var item = parts[i];
                    //console.log ('item is ' + item);
                    var Type = lib.utils.baseType(  ptr[item] );
                    if (lib.utils.baseType(  ptr[item], 'object')) {
			ptr = ptr[item];
                    }else {
			if (i < parts.length -1 ){
                            //console.log('cannot get property. unable to traverse object deeper at [\''+item + '\'] ... type is not object (' +Type+')'  ); //+ 'caller='+hashGet.caller
                            return def ;
			}else {
                            //if (prop == 'runEvents')       console.log ('here ' + item);
                            if (ptr[item] === undefined)return def;
                            return ptr[item];
			}

                    }
		}
		return ptr;
            }else {
		console.log('wasnt able to parse array from prop: '+prop);
		return def;
            }
	}else {
            //console.log('e is not an object'+ E + ' prop '+prop);
            return def;
	}
    }


    /*

    //legacy hash set. cannot do destructive setting. ironically, it works amazingly well on the dom tree where the new sauce doesn't.

      sets a property within the hash. uses the same property methodology  as getProperty.
      
      if a intervening hash key does not exist, it will not be created and will return 0
      else, returns 1 (success)
    */


    function legacySet(E, prop, value){
	//console.log('value is '+value);
	if (lib.utils.baseType(E,'object')) {

	    var parts = lib.utils.toArray(prop,'.');
	    if (parts){
		var ptr = E;
		parts.forEach (function(item,index) {
		    var Type = lib.utils.baseType(  ptr[item]);
		    //console.log(item + ' ' + Type);
		    if (lib.utils.baseType(  ptr[item], 'object')) {
			ptr = ptr[item];
		    }else {
			if (index < parts.length -1 ){
			    console.log('cannot set property. unable to traverse object deeper at [\''+item + '\'] ... type is not object (' +Type+')' );
			    return 0;
			}else {
			    ptr[item] = value;
			    return 1;
			}
		    }
		    
		    
		} );

		
	    }else {
		console.log('wasnt able to parse array from prop: '+prop);
		return 0;
		E[prop] = value;
		return 1;
	    }
	}else {
	    return 0;
	}
    }

    /*
      supports destructive assignments and creation of new keys.
      will not work on the dom tree in all cases, b/c certain properties are actually functions, and cannot accept a hash assignment.
      legacySet DOES WORK. b/c it crawls the tree.
    */
    
    function hashSet(rec, prop, value,opts){
	//console.log('value is '+value);
	prop = lib.utils.toArray(prop,'.');
	if (!prop.length)return value;
	if (!lib.utils.baseType(rec, 'object'))rec = {};


	key = prop[0];
	if (prop.length > 1){
            let nRec = (key in rec)?rec[key]:{}; //  exists($rec->{$tKey})?$rec->{$tKey}:{};
            if (!lib.utils.baseType(nRec, 'object')) nRec = {};
            rec[key] = hashSet(nRec, prop.slice(1) ,value,opts); //[@$target[1..$tLen-1]
	}else{
            rec[key] = value;
	}

	return rec;

	
    }

    function expand(opts, exp){
	
	opts = lib.utils.toHash(opts);
	exp = lib.utils.toArray(exp, " ");
	rv = [];
	for (i in exp){
	    rv.push(opts[exp[i]]);
	}
	return rv;
    }

    function hashAppend(input, pre="",post="",key=0){
	let list , output={};
	if(!lib.hash.is(input))return undefined;

	list = Object.keys(input);
	console.log(list);
	for (let i of list){
            if (key)    output[pre+i+post]=input[i];
            else  if (lib.utils.baseType(input[i], ["string","number"])) output[i] = pre+input[i]+post;
            else output[i]=input[i];


	}
	return output;
    }

    //attach functions, private variables etc to make your life easier.
    function getContext (context, target)
    {
        if(lib.utils.isEmpty(target))return undefined;
        if(lib.hash.is(target))return target;
        //let [a,b] = lib.utils.toString(target,1).toLowerCase().split(':',2);
	let [a,b] = lib.utils.toString(target,1).split(':',2);
        //console.log(`a : ${a}, b: ${b}`);
        const rec = lib.hash.get(context,a);
        if(!b){
            return rec;
        }
        return lib.func.get(rec)?
            lib.func.get(rec,true)(b):
            lib.hash.get(rec, b);
    }    
    var disp = {
	get: hashGet,
	set: hashSet,
	legacySet: legacySet,
	expand: expand,
	to : lib.utils.toHash,
	is : lib.utils.isHash,
	append:hashAppend,
	merge:merge,
	getContext:getContext
	
    };

    return disp;
    

})(lib);

var currentScript = document.currentScript;
//$SECTION - BOOTSTRAPPER
class bootStrapper {

    constructor(opts = {}) {
	let success,failure;
	this.sOpts= lib.utils.isHash(opts)?opts:{};
	//this.sConfs=lib.utils.toArray(confs);
	this.keywords = {
	    'test':1
	};
	this.base =this.sOpts['base'] || './';
	this.repo =this.sOpts['repo'] || 'https://js.m7.org/';
	this.defaultTarget = document.getElementsByTagName("head")[0];
	this.dom = new domManager();
	this.dom.track(currentScript, this.sOpts['currentScript']);
	this.assets = {};
	this.ws = {}; //for passing shit around in case you dont want to pollute assets with non downloads.
	this.plugins = {};
	this.defaults = {
	    load: function (r,opts){console.log('loaded: '+lib.hash.get(r, "responseURL")+(lib.utils.isEmpty(arguments[2])?'':`\ntarget: ${arguments[2]}`) )},
	    error: function (r,opts){
		try {
		    console.log(`error loading :`+lib.hash.get(r,"responseURL")+`\nstatus: `+
				lib.hash.get(r,"status") + " " +lib.hash.get(r,'statusText'),arguments);
		}catch(err){
		    console.log(err);
		    console.log('error loading:',arguments);
		}

	    }
	};
	//bs.append('framework/lib/js/utilsGeneral.js', {target:document.head, tag:'script', attrs:{load:function(){console.log('hello world')}}});
	//bs.append('framework/lib/js/utilsGeneral.js', {target:document.head, tag:'script'});

	success = function(obj){
	    return function(req){
		//console.log('successfully loaded',arguments);
		//obj.assets[
	    };
	}(this);
	failure = function(obj){
	    return function(req){
		console.log('error loading');
	    };
	}(this);
	this.apply(this.repo+'legacy/www.js', 'lib', "httpTool","_www", success );// {dst:'_www',load:success, export: ['httpTool']});
	
    }

    
    // parse confs

    /*
      if list item is a url or keyword.
     */
    _parsePackage(list = []){
	//parses the list of assets.
	list  =lib.utils.toArray(list);
	//loop through each item and turn it into an object. (package?)
	let pList = [];
	let ext = 0;
	let loopFunc = function(item, index){
	    let iType = lib.utils.linkType(item);
	    if(!iType) return;
	    if (this.isPackageKeyWord(item)){
		//collect the package from keywords;
		pList.push(this.getPackage(item));
	    }else if (iType =='relative' || iType =='absolute'){
		//make a package.
		let pkg = {
		    src: [item]
		};
		pList.push(pkg);
	    }else{
		
		//convert from pointer link to package if necessary
	    }
	}
	list.foreach(loopFunc);

    }

    
    
    //runs the queue and inserts tags / downloads assets.
    load(confs = []){
	//loop through tags. and process
	//loop through assets and process
	
	
    }

    //catches the status of the start requests.
    load_callback(){
	
    }


    _isPackageKeyWord(item){
	let keywords = this.keywords;
	let tb = this.tb;
	return  (item in  this.keywords)?1:0;
    }



    
    
    _prepareCSS(inList=[],opts={} ){
	let list = [];
	inList=lib.utils.toArray(inList);opts= lib.utils.isHash(opts)?opts:{};
	for ( let i=0 ,item = inList[i];i<inList.length;item=inList[++i]){
	    let rec,conOpts, rtOpts;  let iType = lib.utils.linkType(item);
	    if(!iType)return;
	    if (iType != 'hash'){
		rec = {    href: item};
	    }else{
		//console.log('item is ',item);
		//rec = item;
		rec = lib.utils.deepCopy(item);
	    }

	    if (lib.utils.linkType(rec['href'], ['hash',undefined]))continue;
	    conOpts ={
		base : opts.base || this.base,
		target:opts.target,
		mode: opts.mode
	    };
	    rtOpts = lib.utils.hashStrip({
		base: opts.base,
		target: opts.target,
		mode: opts.mode 
	    });
	    rec = lib.utils.merge(conOpts, rec);
	    rec = lib.utils.merge(rec,rtOpts);
	    list.push(rec);
	};
	return list;
	
    }

    
    /*map , req
      map: {href:url, src:url}
      req: "url"
     */
    //merge options order: default config -> rec -> runtime
    _prepareList(inList=[],opts={} ){
	let list = [];
	inList=lib.utils.toArray(inList);opts= lib.utils.isHash(opts)?opts:{};
	for ( let i=0 ,item = inList[i];i<inList.length;item=inList[++i]){
	    let rec,conOpts, rtOpts;  let iType = lib.utils.linkType(item);
	    if(!iType)return;
	    if (iType != 'hash'){
		rec = { url: item};
	    }else{
		rec = lib.utils.deepCopy(item);
		if (!('url' in rec)) rec.url = lib.utils.hashOr(['src','href'], rec);
	    }
	    
	    //if (lib.utils.linkType(rec['url'], ['hash',undefined]))continue;
	    conOpts ={
		base : this.base,
		target: this.defaultTarget,
	    };
	    rtOpts = lib.utils.hashStrip({
		base: opts.base,
		target: opts.target,
		mode: opts.mode,
		tag : opts.tag
	    });
	    //console.log('rt opts:', rtOpts);
	    rec = lib.utils.merge(conOpts, rec);
	    //console.log('conf/rec:', rec);
	    rec = lib.utils.merge(rec,rtOpts);
	    //console.log('rec:', rec);
	    if ( !(lib.utils.hasKeys(rec,lib.utils.toArray(opts.req))))continue;
	    list.push(rec);
	};
	return list;
	
    }


    /*
      url/src/hrer
      base
      target
      tag
      mode
     */
    _prepareCreate(item,opts){
	//let rec,conOpts, rtOpts;  let iType = lib.utils.linkType(item);
	let rec;
	if (!lib.utils.isHash(item))return undefined;
	rec = lib.utils.deepCopy(item);
	if (!('url' in rec)) rec['url'] = lib.utils.hashOr(['src','href'], rec);
	if('load' in rec)lib.hash.set(rec,'attrs.load', rec['load']);
	if('error' in rec)lib.hash.set(rec,'attrs.error', rec['error']);
	rec['base'] = rec['base'] || this['base'];
	rec['target'] = rec['target'] || this['defaultTarget'];
	if ( !(lib.utils.hasKeys(rec,lib.utils.toArray(opts.req))))return undefined;
	return rec;
    }

    
    //needs a url, tag, target
    //url tag, target, mode, item
    //$createElement
    createElement(url,tag, target, load,error, item){
	let tagFunc,base;
	item = lib.args.parse(arguments,{url:undefined,target:undefined, tag:undefined, mode:undefined,base:undefined,track:undefined}, "url tag target load error");
	item = this._prepareCreate(item,{req:['tag']});
	if (!item) return 0;
	target = lib.dom.getElement(item.target);
	if (!target) return 0;
	base = item['base']?item['base']:this.base?this.base:"";
	url = lib.utils.linkType(item.url,'relative')?base+item.url:item.url;

	//url = lib.utils.linkType(item.url,'relative')?(item.base?item.base:"")+item.url:item.url;
	tag = lib.utils.lc(item.tag);
	tagFunc = (tag in lib.app.bootstrap.append)?tag:'default';
	//console.log(`loading ${url} ${tag} : `, tagFunc);
	//console.log('createElement:using base ' + base + ' , url '+url);
	var e = lib.app.bootstrap.append[tagFunc](item);
	
	if (!e){
	    console.log('unable to create element ',item);
	    return 0;
	}

	//console.log(`tracking and attaching ${target}, ${item.mode}`);
	this.lastE = e;
	this.dom.track(e,item['track']);
	this.dom.attach(e, target, item['mode']);
	return 1;
    }
    
    
    //appends elements to dom.
    //$append
    append(inList=[], opts={}){
	let list = this._prepareList(inList, lib.utils.merge(opts,{req:['tag']}));

	for ( let i=0 ,item = list[i];i<list.length;item=list[++i]){
	    console.log('item is',item);
	    let target = lib.dom.getElement(item.target);
	    //console.log('here');
	    if (!target) continue;
	    
	    var url = lib.utils.linkType(item.url,'relative')?(item.base?item.base:"")+item.url:item.url;
	    let tagName = lib.utils.lc(item.tag);
	    console.log(`loading ${url} ${tagName} : `, (tagName in lib.app.bootstrap.append)?tagName:'default');
	    
	    var e = lib.app.bootstrap.append[(tagName in lib.app.bootstrap.append)?tagName:'default'](item);
	    
	    if (!e){
		console.log('unable to create element ',item);
		continue;
	    }

	    console.log(`tracking and attaching ${target}, ${item.mode}`);
	    this.lastE = e;
	    this.dom.track(e,item['track']);
	    this.dom.attach(e, target, item.mode);
	    
	}
    }
    
 

    /*
      url: url
      load: handler for load
      error: handler for error
    */
    //$request
    request(url, load, error, opts){
	let wrapper,id, store;
	opts = lib.args.parse(arguments,{url:undefined,load:undefined, error:undefined,method:'GET', body:undefined}, "url load error");
	
	wrapper = function(obj,func, opts){
            return function(req){
		lib.utils.getFunction(func,1)(req,opts);
            };
        };
	load = wrapper(this,opts.load,opts);
	error = wrapper(this,opts.error,opts);
        lib._http.get(url, {load:load,error:error,method:opts.method,body:opts.body});
    }

  

    
    /*
      apply == applyRequest

      apply(src, apply, load,dst,opts)
      apply(src, apply, exports, load,dst, opts)
      apply("json.js", "json", onload, opts)
      apply("lib.utils", "lib", "exports", onload, opts);
    */
    //$apply
    apply(desc, action,exports, opts){
	return this.applyRequest(...arguments);
    }

    //$applyRequest
    applyRequest(desc, action,exports, opts){
	let load,error,url,base,param;
	action = lib.utils.toString(arguments[1],{lc:1, force:1}); //check to see if short hand was used...
	action = lib.utils.toString(action,{lc:1, force:1});
	    
	param = `desc action ${action.match(/lib|plugin/i)?"export":""} dst load error`;
	//console.log(`param = ${param}`);
	opts = lib.args.parse(arguments,{'desc':0,'type':'export'},param);
	//console.log('applying request...',opts);
	action = lib.utils.toString(opts.action,{lc:1, force:1});

	if (opts['nowrap'] == true){ //this is for loadPackage, it needs to wrap over this.
	    load = opts['load'];
	    //console.log('in nowrap',load);

	}else {
	    //console.log(`here ${action} ${desc}`);
	    //if (!('load' in opts))opts['load'] = this.defaults['load'];
	    //load = lib.app.bootstrap.remote.wrapper[(action in lib.app.bootstrap.remote.wrapper)?action:'def'](this,opts);
	    load=this.wrapLoad(opts);
	}
	error = opts.error || this.defaults['error'];
	//url = lib.utils.linkType(opts.desc,'relative')?(this.base?this.base:"")+opts.desc:opts.desc;
	base = opts['base']?opts['base']:this.base?this.base:"";
	url = lib.utils.linkType(opts.desc,'relative')?base+opts.desc:opts.desc;
	//console.log('using base ' + base + ' , url '+url,opts);
	console.log(`request(${action}) ${url} `+ (opts['dst']?`as ${opts['dst']}`:""));
	this.request(url, load, error,opts); //opts.desc
	return ;
    }

    //$plugin
    plugin(target,opts){
	let plugin, func;
	[target, func] =target.split('::');;
	if (lib.utils.isEmpty(func) ) func = "main";
	if (plugin = lib.hash.get(this.plugins,target)){
	    if (typeof plugin[func] === 'function'){
		console.log(`running ${target}.${func}`);
		plugin[func](...lib.args.slice(arguments,1,undefined));
	    }else {
		console.log(`not a function: ${target}.${func}`);
	    }
	}else {
	    console.log(`plugin not found (${target})`);
	    return;
	}
	
    }

    registerPlugin(cls, target, opts){
	lib.app.bootstrap.plugin.registerClass(bs,cls, target , opts);
    }
    //runs a sequence of actions.
    runSequence(list,opts){
	//console.log('running sequence...');
    }

    /*
      hash of parms, or array of hash
      [
      {
        loadid: xyz,
	
        load: [
	
	],
	run: [
	
	]
	}
      ],{...}
     */
    loadPackage(pkgList,opts){
	pkgList = lib.utils.toArray(lib.utils.deepCopy(pkgList));
	opts = lib.utils.toHash(opts, {def:{overwrite:0}});
	let pkg, loadList,requests,tags,tagOpts, prepend, pkgHandler,runWrapper,runSequence =0,runEvents,eRun=0;
	pkg = pkgList.shift(0);
	console.log('OPTS IS', opts);
	runEvents = function(pp){
	    let events = lib.hash.get(pp, "pkg.event");
	    events = lib.utils.baseType(events, ['string','array'])?lib.utils.toArray(events):undefined;
	    if(!events)return 0;
	    lib.event.set(events);
	    return 1;
	}

	runWrapper = function(pp,list,pkgs,opts){
	    return function(){
		//console.log('in run wrapper',arguments,'-----',pp);
		
		for (let i=0; i < list.length;i++){
		    //console.log(`list i=${i} (${list[i]}`);
		    let fname = lib.utils.baseType(list[i],'string')?list[i]:
			(lib.utils.baseType(list[i],'function') && list[i].name)?list[i].name:'anonymous function';
		    
		    console.log(`>>running[load] ${fname}`);
		    if (lib.utils.baseType(list[i],'string') && list[i].toLowerCase() == 'runevents'){
			runEvents(pp);
			eRun = 1;
		    }else
			lib.utils.getFunction(list[i],1)(pp);
		}
		if(!eRun)runEvents(pp);
		if(pkgs.length)pp.bs.loadPackage(pkgs,opts);
	    }
	}

	/*beging current items : split off the items we are working on right now.*/
	//pkgBase = lib.hash.get(pkg,"base") || this.base;
	loadList=lib.utils.toArray(pkg['load']);
	console.log('>>loadlist:',loadList);
	requests = lib.utils.toArray(lib.hash.get(pkg, 'request.items')); //used to be cLib
	tags = lib.utils.toArray(lib.hash.get(pkg, 'tag.items')); //used to be append
	tagOpts = lib.utils.toHash(lib.hash.get(pkg, 'tag.opts'));

	//console.log('load list:'+loadList.length);
	/*end current items*/
	prepend = {bs:this,lib:lib, pkg:pkg};
	//loadlist = current functions to run, pkgList = remaining packages.
	pkgHandler = runWrapper(prepend,loadList,pkgList,opts); //runlist

	if (!requests.length && !tags.length){
	    pkgHandler();
	    return 1;
	}

	{
	    let controller = new lib.sync.controller(pkgHandler, prepend);
	    
	    let missed = 0;
	    if(requests.length){
		for (let i=0; i < requests.length;i++){
		    let itmHandler, dst, action;
		    action = lib.utils.toString(requests[i]['action'],{force:1, lc:1});
		    requests[i]['nowrap'] =true;
		    itmHandler = this.wrapLoad(requests[i]);
		    if(!requests[i]['overwrite'] && !opts['overwrite'] &&  action.match(/lib/) && requests[i].dst && lib.hash.get(lib, requests[i]['dst'])){
			console.log(`already LOADED LIB ${requests[i]['desc']} - `,opts);
			missed++;
			continue;
			
		    }else if (!opts['overwrite'] && requests[i]['dst'] && lib.hash.get(this.assets, [requests[i]['dst']])){
			console.log('ALREADY STORED '+requests[i]['desc']);
			missed++;
			continue;
		    }


		    lib.hash.set(requests[i], 'load', controller.wrapper('request'+i,itmHandler ));
		    //console.log('passing to applyrequest', requests[i]);
		    this.applyRequest(lib.utils.merge({base:pkg['base']},requests[i]));
		}

	    }
	    //console.log('onto tags...',tags.length);
	    if(tags.length){
		for (let i=0; i < tags.length;i++){
		    let itmHandler = lib.hash.get(tags[i],'load');
		    //console.log('checking '+tags[i]['track']);
		    if(!opts['overwrite'] && tags[i]['track'] && this.dom.lookup(tags[i]['track'])){
			console.log('ALREADY ATTACHED ',tags[i]);
			missed++;
			continue;
		    }
		    lib.hash.set(tags[i], 'load', tags[i]['rload']==0?itmHandler:controller.wrapper('tag'+i,itmHandler ));
		    this.createElement(lib.utils.merge({base:pkg['base']},tags[i]));
		}

	    }
	    if (missed >= tags.length+requests.length)pkgHandler();;

	}
	
    
	return 1;
    }
    wrapLoad(opts){
	let load;
	//opts['load']= lib.hash.get(opts,'load') || this.defaults['load'];
	if (!('load' in opts))opts['load'] = this.defaults['load'];
	//console.log('itm handler1', opts['load']);
	//console.log('wrapping',opts);
	let action = (opts['action'] in lib.app.bootstrap.remote.wrapper)?opts['action']:'def';
	load = lib.app.bootstrap.remote.wrapper[(opts['action'] in lib.app.bootstrap.remote.wrapper)?opts['action']:'def'](this,opts);
	//console.log(`it handler2 ${opts['action']} - ${action}`, load);
	return load;
	
    }
}
//manages tracking of resources
//$SECTION - DOMMANAGER
class domManager{
    constructor () {
	this.runMAX = 50;
	this.counter = 0;
	this.tracker = this._init();
    }

    //sets up tracking hash for managing loaded assets
    _init(){
	let tracker = {	};
	return tracker;
	
    }
    
    makeID(id){
	let runs = 0;
	if (id){
	    if (typeof(id) != 'string' && typeof(id) != 'number')return undefined;
	    if( this.tracker[id])return undefined;
	    return ""+id;
	}
	while(runs++ < this.runMAX){
	    let id = this.counter++;
	    if (!this.tracker[""+id])return id;
	}
	return undefined;
    }
    track (e, opts = {}){
	let id, rec = this.lookup(e);
	if (!e || rec  )return 0;
	if (typeof(opts) == 'string' || typeof(opts) == 'number') opts = {id:""+opts};
	if (typeof(opts) != 'object')opts=={};
	id = this.makeID(opts.id);
	if (id ===undefined)return 0;
	rec = {
	    e: e,
	    id : id,
	    dom: 1,
	    display: undefined,
	    user: opts.user || {}
	};
	this.tracker[id] = rec;
	return 1;
    }

    //stops tracking an element.
    release(e){
	let rec= this.lookup(e);
	if (!rec)return 0;
	delete this.tracker[rec.id];
	return 1;
    }

    //finds an element by dom, tagid or target
    findTarget(e,defTarget=undefined){
	if (lib.dom.isDom(e))return e;
	if (e && lib.utils.isScalar(e)){
	    e = lib.utils.toString(e);
	    if (e.match(/^\$/)){
		let f = this.lookup(e.substr(1));
		if (f)return f.e;
	    }else return lib.dom.byId(e);
	}
	return this.findTarget(defTarget);
    }
    
    //returns a tracked based on id or element
    lookup(e,order = []){
	//if (!e) return undefined;
	if (e instanceof Element){
	    let list = Object.keys(this.tracker);
	    for (let i = 0,item = this.tracker[list[i]];i < list.length;item=this.tracker[list[++i]]){
		if (item.e == e)return item;
	    }
	}else if ((typeof(e) == 'string' || typeof(e) =='number') && e !==undefined) {
	    if (this.tracker[""+e]) return this.tracker[""+e];
	}
	return undefined;
    }

    //sets style.display to x
    display(e,display){
	let rec= this.lookup(e);
	if (!rec)return 0;
	rec.e.style.display = rec.display = display || "";
	return 1;
    }

    //removes from dom tree. keeps a pointer to the element in case you want to move it somewhere else
    detach(e,release){
	let rec= this.lookup(e);
	if (!rec)return undefined;
	//console.log('detaching...');
	e= lib.dom.removeElement(rec.e);
	if (e) {
	    rec.dom=0;
	    if (release==1)this.release(rec.id);
	    return e;
	}
	return undefined;
    }
    
    //attaches an element somewhere else if you want.
    attach(e,target=undefined,subTarget=undefined){
	let rec= this.lookup(e);
	if (!rec){console.log('rec',e ,'not found...');return 0;}
	//if(rec.dom==1)return 0;
	target = target?this.findTarget(target):document.getElementsByTagName("head")[0];
	//console.log('attach target is ', target);
	if (!target) return 0;

	subTarget = (!lib.utils.isEmpty(subTarget) && lib.utils.baseType(subTarget,['string','number']))?""+subTarget:undefined;
	subTarget = subTarget?subTarget.toLowerCase():undefined;
	if (!(subTarget in lib.dom.append))subTarget = 'append';
	lib.dom.append[subTarget](rec.e, target);
	rec.dom = 1;
	return 1;
    }
    

}


