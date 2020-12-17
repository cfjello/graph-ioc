function example(target: any) {
    // save a reference to the original constructor
    const original = target;

    // the new constructor behaviour
    const f: any = function (...args: any[]) {
        console.log("Hook before original constructor...");

        const newArgs = [...args].reverse();

        const instance = new original(...newArgs);

        console.log("Hook after original constructor...");

        instance.d = 'ddd';

        return instance;
    }

    // copy prototype so intanceof operator still works
    f.prototype = original.prototype;

    // return new constructor (will override original)
    return f;
}

@example
class SomeClass {
    constructor(public a: number, public b: number, public c: number) {
        console.log("Hello from constructor for: " + this.constructor.name)
    }
}

const instance1 = new SomeClass(1, 2, 3);
console.log(instance1); // SomeClass {a: 3, b: 2, c: 1, d: "ddd"}