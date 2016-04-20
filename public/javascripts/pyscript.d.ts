declare module pyscript.requests {
    function get(url: string, params: any): Promise;
    function post(url: string, params: any): Promise;

    interface Promise {
        then(callback: Function): Promise;
    }
}

declare module pyscript {
    function initialized(module: string);
}