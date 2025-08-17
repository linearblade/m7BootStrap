function assetItemLoad(...args){	console.warn ('asset item load hook', args);	}
function assetItemError(...args){       console.warn (' asset item error hook', args);	}
function assetLoad(...args){            console.warn ('assets loaded successfully',args); }
function assetError(...args){           console.warn ('assets failed to load sucessfully', args); }

function moduleItemLoad(...args){	console.warn ('module item load hook', args);	}
function moduleItemError(...args){      console.warn ('module item error hook', args);	}
function moduleLoad(...args){           console.warn ('modules loaded successfully',args); }
function moduleError(...args){          console.warn ('modules failed to load sucessfully', args); }

function repoItemLoad(...args){	        console.warn ('repo item load hook', args);	}
function repoItemError(...args){        console.warn ('repo item error hook', args);	}
function repoLoad(...args){             console.warn ('repo loaded successfully',args); }
function repoError(...args){            console.warn ('repo failed to load sucessfully', args); }

function packageLoad(...args){          console.warn ('package loaded successfully',args); }
function packageError(...args){         console.warn ('package failed to load sucessfully', args); }
function loadError(...args) {           console.error('bootstrap load failed', args); }
export default {
    load: ["#runners.mount"],
    error : loadError,
    limit : 8,
    package: {
	limit: 5,
	hooks:true,
	load: packageLoad,
	error: packageError
    },
    repo:{
	limit: 5,
	itemLoad: repoItemLoad,
	itemError: repoItemError,
	load: repoLoad,
	error: repoError
    },
    module: {
	limit : 5,
	itemLoad: moduleItemLoad,
	itemError: moduleItemError,
	load: moduleLoad,
	error: moduleError
    },
    asset: {
	limit: 5,
	itemLoad: assetItemLoad,
	itemError: assetItemError,
	load: assetLoad,
	error: assetError
    }
};


