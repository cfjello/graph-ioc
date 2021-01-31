# TODO

- Serializable objects ( probably use node serialize-javascript and deno crypto.randombytes )
- Integrate the bootstrap function into Ctrl:
    - Ensure the correct execution order between @action, constructor() and botstrap()
- Use the reflect-metadata package for the metadata
- Remove jobId references from Store:
    - remove index prefix default
    - check if index exists before creating
    - Find some hash-freindly, but sortable, id type for jobIds
    - Also, test the creation of some other indexcies 
- Implement the job depth based thresshold cleanup for:
    - Jobs and Store objects
    - Indexes
    - Interdependencies and conflict resolution for multiple jobs and indecies
    - Read consistency when deleting
- cxmeta, es6 data types:
    - check all type found in: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
    - This could be a stand-alone package, that is generic javascript function for both Node and Deno
    - 

