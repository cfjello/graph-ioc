/**
 * The Ctrl transaction Ids 
 */
let jobNum: number = 1
export function* jobIdSeq() {
    while(true) {
        yield jobNum++;
    }
}

/**
 * The Ctrl transaction sequence Id 
 */
let taskNum: number = 1
export function* taskIdSeq() {
    while(true) {
        yield taskNum++;
    }
}

/**
 * The Ctrl transaction sequence Id 

let swarmNum: number = 1
export function* swarmIdSeq() {
    while(true) {
        yield swarmNum++;
    }
}
 */