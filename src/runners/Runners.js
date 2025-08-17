/*
 * Copyright (c) 2025 m7.org
 * License: MTL-10 (see LICENSE.md)
 */
/*
  helper class for translating '#' symbolics to the the local system, b/c run handlers passes arguments in an unfriendly way.
*/
import PackageLoadReport from '../report/PackageLoadReport.js';
import BootStrapLoadReport from '../report/BootStrapLoadReport.js';
export class Runners {
    constructor(bootstrap){
	this.bootstrap = bootstrap;
    }

    mount(sys,ctx){
	const bsReport = ctx?.report;
	if (!(bsReport instanceof BootStrapLoadReport)){
	    console.warn('report is not a valid BootStrapeLoadReport',bsReport);
	    return false;
	}
	
	const reports = bsReport?.packages ?? [];
	for (const report of reports){
	    this.mountPackage(sys,{report});
	}

    }

    unmount(sys,ctx){
	const reports = ctx?.report?.packages ?? [];
	const pkg = ctx?.report ?? null;
	const list = [];
	if (reports.length) {
	    for (const report of reports){
		if (!report?.pkgId) continue;
		list.push(pkgId);
	    }
	}else if (pkg){
	    const list = Array.isArray(pkg)?pkg:[pkg];
	    if(Array.isArray(pkg)){
		list.push(...pkg);
	    }else {
		list.push(pkg);
	    }
	}
	for (const pitem of list)
	    this.unmountPackage(sys, {pkg:pitem} );
    }

    mountPackage(sys, ctx) {
	const report = ctx?.report;
	const pkg = ctx?.pkg;
	let id = null;
	if (pkg){
	     id = typeof pkg ==='object'? pkg.id:id;
	}else {
	    if (!(report instanceof PackageLoadReport)){
		console.warn('report is not a valid PackageLoadReport',report);
		return false;
	    }
	    id = report.pkgId;
	}
	this.bootstrap.mount.load(id);
    }
    unmountPackage(sys, ctx) {
	const pkg = ctx?.pkg;
	if (!pkg) {
	    console.warn('no package supplied for unmount');
	    return false;
	}
	const id = typeof pkg ==='object'? pkg.id:id;
	this.bootstrap.mount.unload(id);
    }

    //generalized package load error handler. mostly for debugging.
    packageError(sys,ctx){
	console.warn("inside package error",ctx);
	const report = ctx?.report;
	if (!(report instanceof PackageLoadReport)){
	    console.warn('report is not a valid PackageLoadReport',report);
	    return false;
	}
	console.error(`there was an error loading the package ${report.pkgId}`,report);
	return true;
    }
}

export default Runners;
