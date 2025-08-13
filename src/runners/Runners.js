/*
 * Copyright (c) 2025 m7.org
 * License: MTL-10 (see LICENSE.md)
 */
/*
  helper class for translating '#' symbolics to the the local system, b/c run handlers passes arguments in an unfriendly way.
 */
export class Runners {
    constructor(bootstrap){
	this.bootstrap = bootstrap;
    }

    mount(sys,ctx){
	const reports = ctx?.report?.packages ?? [];
	for (const report of reports){
	    if (!report?.pkgId) continue;
	    this.bootstrap.mount.load(report.pkgId);	    
	}

    }

    unmount(sys,ctx){
	const reports = ctx?.report?.packages ?? [];
	for (const report of reports){
	    if (!report?.pkgId) continue;
	    this.bootstrap.mount.unload(report.pkgId);	    
	}
    }
}

export default Runners;
