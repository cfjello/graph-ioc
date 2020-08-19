/**
 * The Ctrl transaction Ids 
 */
let jobNum: number = 0
export function* jobIdSeq() {
    while(true) {
        yield jobNum++;
    }
}

/**
 * The Ctrl transaction sequence Id 
 */
let taskNum: number = 0
export function* taskIdSeq() {
    while(true) {
        yield taskNum++;
    }
}