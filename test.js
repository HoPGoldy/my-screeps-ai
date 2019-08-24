Object.defineProperty(global, 'c', { get: () => console.log(123)})

global.c