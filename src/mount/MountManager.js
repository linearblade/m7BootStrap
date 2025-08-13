/*
 * Copyright (c) 2025 m7.org
 * License: MTL-10 (see LICENSE.md)
 */
/*

  {
  id: string,             // ✅ Required: local asset ID (must be type:'mount')
  selector?: string,      // Optional: CSS selector to insert relative to (default: document.body)
  container?: string,     // Optional: tag name to wrap content in (e.g., 'div', 'section', 'style')
  method?: string,        // Optional: DOM insertion strategy:
  // "replace" (replaces target element),
  // "before" | "after" (sibling insert),
  // "prepend" | "append" (child insert)
  // Default: "append"

  dissolve?: boolean,     // Optional: if true and container has one child, replace container with it
  attrs?: object          // Optional: HTML attributes to apply to the container
  }
*/
import domAttach from './domAttach.js';
import DomInjector from '../dom/DomInjector.js';
export class MountManager {
    constructor(bootstrap) {
        this.bootstrap = bootstrap;
	this.injector = new DomInjector(bootstrap); 
    }

    alreadyMounted(pkgID,options={}){
	const mounted = this.bootstrap.packages.data.mounted.get(pkgID);
	if ( mounted &&  options?.force !== true){
	    return true;
	}
	return false
    }
    setMounted(pkgID,to=true){
	this.bootstrap.packages.data.mounted.set(pkgID,to);
    }
    
    /**
     * Executes the mount handler with the resolved package.
     * @param {Function|Promise<Function>} mountFn - A function or promise returning one
     * @param {Object} pkg - The loaded package definition
     * @param {Object} args - Optional runtime arguments
     */


    // mount all assets of type: 'mount' (each is a JSON config with {items:[]})
    async load(pkgID=null, options = {}) {
	if (pkgID && !this.bootstrap.packages.isLoaded(pkgID) ){
	    console.warn(`package ${pkgID} not loaded, cannot mount`)
	    return false;
	}

	const plist = pkgID
	      ? [pkgID]
	      : Array.from (this.bootstrap.packages.data.packages.keys() );

	
	if(pkgID && this.alreadyMounted(pkgID,options) ){ //silently complain on bulk load.
	    console.warn(`${pkgID} already mounted, use unload first or options.force=true`);
	    return true;
	}
	   

	for (const key of plist){
	    if (this.alreadyMounted(key,options) )
		continue;
	    this.injectAssets(key,options);
	    this.setMounted(key,true);
	}

	return true;
    }
    
    async unload(pkgID=null, options={}) {
	if(!pkgID) pkgID = null;
	if (pkgID && !this.bootstrap.packages.isLoaded(pkgID) ){
	    console.warn(`package ${pkgID} not loaded, cannot unmount`);
	    return false;
	}

	const plist = pkgID
	      ? [pkgID]
	      : Array.from (this.bootstrap.packages.data.packages.keys() );
	
	for (const key of plist){
	    this.bootstrap.dom.registry.clear(key,true);
	    this.setMounted(key,false);
	}
	return true;
    }
    
    async injectAssets(pkgID,options={}){
	if(!pkgID){
	    console.warn('no pkg id, cannot inject');
	    return;
	}
	    
	let selector = { type: 'mount',packageID: pkgID };
	//console.log('mounting assets with selector ',selector);
	const mountAssets = this.bootstrap.packages.data.getAssets(selector);

	for (const [assetId, entry] of Object.entries(mountAssets)) {
	    //console.warn(assetId,entry);
	    if(this.alreadyMounted(this._pkgID_fromEntry(entry) ,options) )
		return;
	    const cfg = entry?.content?.body ?? null;
	    if (!cfg) continue;
	    
	    const items = Array.isArray(cfg.items) ? cfg.items : [];
	    // Map local ID -> asset entry (so we can reference board/style/sound)

	    //const pkgAssets = packages.getPackageAssets(pkgId);

	    for (const item of items) {
		const node = this.inject(entry,item);
		if(!node) continue;
		this.track(entry,node);
		//this.mounted.push({ node, meta: src.meta, item, from: assetId });
	    }
	}

    }
    _pkgID_fromEntry(entry){
	return  entry?.meta?.packageID;
    }
    inject(entry,item){
	const pkgId = this._pkgID_fromEntry(entry);
	const localId = item?.id;
	if (!localId) return;
	
	// stored IDs in PackageManager are namespaced; look up by originalID
	const src = this.bootstrap.packages.data.getPackageAsset(pkgId, localId);
	if (!src) {
	    console.warn(`[MountManager] Missing asset "${localId}" in package "${pkgId}".`);
	    return;
	}

	const node = this.bootstrap.dom.injector.inject(src, {
	    selector:  item.selector || 'body',
	    container: item.container,      // e.g., 'template', 'style', 'div'
	    method:    item.method || 'append',
	    dissolve:  !!item.dissolve,
	    attrs:     item.attrs || {}
	});
	return node;
    }
    track(entry,node){
	if (!this?.bootstrap?.dom?.registry){
	    console.warn("dom registry not found. skipping");
	    return;
	}
	const pkgId = this._pkgID_fromEntry(entry);
	this.bootstrap.dom.registry.track(node, {group: pkgId} );
	
        // store a little backlink so we can unmount easily
        //finalNode.__mountedBy = { id: trackId, meta: entry?.meta || null };
    }


    
    
}

export default MountManager;

