function unloadError(...args) {  console.error('there was an error unloading...',args); }

export default {
    hooks:undefined,
    load: '#runners.unmount',
    error: unloadError
};
