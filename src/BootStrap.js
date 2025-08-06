/*
 * Copyright (c) 2025 m7.org
 * License: MTL-10 (see LICENSE.md)
 */
/**
 * BootStrap.js
 * 
 * The central controller for initializing and managing the application boot process.
 * Delegates to modular subsystems: PackageManager, Repo, DomRegistry, etc.
 * 
 * Usage:
 *   const bootstrap = new BootStrap(net, { repo: {...} });
 *   await bootstrap.loadScene("scene:chess");
 **/

import Repo from './repo/Repo.js';
import PackageManager from './packages/PackageManager.js';
import DomRegistry from './dom/DomRegistry.js'; // Optional: for asset mounting later
import MountManager from './mount/MountManager.js';
export class BootStrap {
    /**
     * Initializes the BootStrap controller.
     *
     * @param {Net} net - Networking layer (must provide .http, .batch, etc.)
     * @param {Object} options - Boot configuration
     * @param {Object} [options.repo={}] - Initial repo configuration
     */
    constructor(net, { repo = {} } = {}) {
        if (!net) {
            throw new Error("BootStrap requires a valid Net instance");
        }

        this.net = net;

        this.repo = new Repo(this, repo);              // Manages package source resolution
        this.packages = new PackageManager(this);      // Coordinates loading and asset/module registry
        this.dom = new DomRegistry();                  // Optional: mounts DOM assets like HTML/CSS
	this.mount = new MountManager(this);
    }


    /**
     * Load and initialize a package by symbolic ID or inline definition.
     *
     * @param {string|object} def - Package ID (e.g., "scene:chess") or inline object.
     * @param {object} [options={}] - Options passed to Repo loader (e.g., { repo: [...] }).
     * @returns {Promise<boolean>} True if successfully loaded, false otherwise.
     */

    async load(pkgInstructions, mountInstructions, options = {}) {
	const pkg = await this._resolveAndLoad(pkgInstructions);
	if (!pkg) return false;

	

	
	console.warn('running mounter instructions',mountInstructions);
	const localMountInst = this._resolveLocalResource(mountInstructions);
	console.warn(localMountInst);
	const mount = await this._resolveAndLoad(localMountInst);
	if (!mount) return false;

	// TODO: Mount logic comes here...
	// await this.mount.load(...);

	return true;
    }
    
    /**
     * Internal helper: resolves and loads a package from a resource string or object.
     *
     * @param {object|string} input - Resource string or inline object
     * @returns {Promise<object|null>} Loaded package definition, or null on failure
     */
    async _resolveAndLoad(input) {
	const def = await this.repo.resolve(input);
	if (!def) {
            console.warn("[BootStrap] Failed to resolve package:", input?.resource ?? input);
            return null;
	}

        if (this.packages.isLoaded(def.id)) {
	    console.warn(`isLoaded: Package "${def.id}" already loaded.`);
	    return true;
        }

	
	console.warn(`starting load package for ${def.id}`);
	const success = await this.packages.load(def);
	
	if (!success) {
            console.warn("[BootStrap] Failed to load package:", def.id || '[unknown]');
            return null;
	}
	console.warn(`loaded ${def.id}...trying dependencies`,this.packages.isLoaded(def.id));
	const depsOk = await this._loadDependencies(def);
	console.warn(`after dep load for ${def.id}`);
	if (!depsOk) {
            console.warn("[BootStrap] Failed to load dependencies for package:", def.id);
            return null;
	}
	console.warn(`deps satisfied for ${def.id}`);
	return def;
    }


    _resolveLocalResource(mountRef) {
	if (typeof mountRef === 'string' && mountRef.startsWith('@')) {
            const key = mountRef.slice(1);
            const res = this.menu?.resources?.[key];
            if (!res) {
		console.warn(`[BootStrap] Local mount resource '${key}' not found in menu.resources`);
		return null;
            }
            return res;
	}
	return mountRef;
    }


    async _loadDependencies(pkg) {
	if (!pkg?.dependencies || !Array.isArray(pkg.dependencies)) return true;

	for (const dep of pkg.dependencies) {
            const resolved = await this._resolveAndLoad(dep);
            if (!resolved) return false;
	}
	console.warn(`loaded any dependencies for  ${pkg.id}`);
	return true;
    }
  
 
    
 
    /**
     * Get a loaded asset or module by ID.
     * 
     * @param {string} id 
     * @returns {*} loaded asset or module reference
     */
    get(id) {
        return (
            this.packages.getAsset(id) ||
            this.packages.getModule(id) ||
            null
        );
    }

    /**
     * List all loaded packages.
     * @returns {string[]}
     */
    listPackages() {
        return this.packages.list();
    }

    /**
     * Reset internal state (packages, assets, modules, etc.)
     */
    reset() {
        this.packages.reset();
        this.dom.reset?.();
    }

    // TODO: Replace with lib.func.get() once available
    static LIBFUNCGET(f,dummy=false){
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
                    if (typeof t ===  'function')return t;
		}

            }
	}

	return dummy?function () {}:undefined;
    }
    
}

export default BootStrap;
