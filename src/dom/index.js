/*
 * Copyright (c) 2025 m7.org
 * License: MTL-10 (see LICENSE.md)
 */
import DomRegistry from './DomRegistry.js'; //  for asset tracking later
import DomInjector from './DomInjector.js'; //  for asset injection


export default function domInstall(controller){
    
    return {
	registry: new DomRegistry(controller),
	injector: new DomInjector(controller)
    };
};
