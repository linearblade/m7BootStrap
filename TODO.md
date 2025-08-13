this is my scratch pad. you can look at it or whatever. its much faster than jumping in and out of jira

[x] net.batch requires concurrency limiting implemented. (more of a m7Fetch thing but still the same shit list.)
[x] full granularity on handlers where it matters , package , module and asset loads
[x] mount / unmount : either overload the function parameters or split the functions for api wrapper. this could be done via #mount and #unmount instead of #mount.load and mount.unload,
[x] mount / unmount : pkg level mount / unmount
[x] standardize and double check all ctx values on _runHandlers
[x] probably a final pass on documentation for this version
[x] get the files uploaded into the package, and push live.
[x] logging. // basically solved with the reports
[x] investigate libfuncget incase window is an issue for npm
[x] mount load on same target seems to delete the document body

(note that reports or other 'asyncronous items' may output inconsistently in teh console, b/c they are references) if you want to debug them convert the relevant data to json and then console.log/error whatever it.)
(reports are custom to the type of action. Repo -> RepoLoadReport, module -> ModuleLoadReport, etc)

repo
-no access to package local functions for '~function'
itemload, itemerror : node,def,report (on error, def will be nullish)
load/error : input,output, report


asset loader
-may have access to package local functions for '~function' notation. unreliable due to load order. not reccomended for use
-itemload/itemerror : {pkg, asset,id,batch,report}, (report will likely be partially filled out, b/c this is a per item call, and not yet finished. may have useful debugging information)
   -batch is the batch handler object, can inspect batch.controller for details of progress. will not likely be filled out fully either due to asyncronous requests not yet complete)
   - asset is the asset that triggered this information (package asset entry)
-load/error         : {pkg, sync,batchResults,report}
  - sync is the syncloader object created for the net.batch.run request.
  - batchresults is the output of the completed net.batch.run request. 


module loader
-modules have moderate access to package local functionality for '~function' , however if a load fails, then obviously that module wil not be available.
-as usual, report may or may not be fully filled out on per item requests, b/c the report may not yet be complete.
-itemload/itemerror : {pkg,report,module } module is the current module item being processed.
   -module record format: 
   - .then((mod) => ({ status: 'fulfilled', id: fullID, mod }))
     .catch((err) => ({ status: 'rejected',  id: fullID, err }));
-load/error         : {pkg, report }

packageloader 
-full access to pkg local notation '~function'
-hooks will only run if enabled and module loading is successful.
-hooks/load/error : {pkg,report}

bootstrap
-no access to pkg local notation, this is the top level package loader, and no particular package is selected here
{  report,  options,   err } // options are the load level options passed in from bootstrap.load, err are errors, but may also be retrieved from the individual reports




