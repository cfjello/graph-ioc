/**
 * Store sequence generator for internal numbering of sequences
 */
let stSeq: number = 0
export function* storeSeq() {
    while(true) {
        yield stSeq++;
    }
}