# CxCtrl

Please NOTE: Release 0.0.1, PRE-ALPHA - Not ready for use!

This is an experimental Graph based Inversion of Control System running server side on Deno. It has the following main features:

- User defined Action classes that own, maintain and publish each their own data objects. They also defines their dependencies of other Actions.
- Program Flows that are generated as hierarchies of dependencies between Actions. 
- A Controller that orchestrates the Program Flows into execution trees called Jobs. Jobs are unidirectional hierarchical structures that are executed bottom up, that is from the leafs of the tree or sub-tree to the executing root node. In practical programming terms, these Jobs can though of as single- and/or multi-branch Promise-chains, where each node is executed in the correct order. 
- An in-memory immutable Data Store with versioned data objects, that allows for other Actions gain read-only access.


So, an application using this system can be viewed as having three integrated layers:


| Module                                                    |                                                       Features |
| :------------------------------------------------------------- | -------------------------------------------------------------: |
|User defined Data Objects and Actions acting on these objects: |Decorator, Factory and Bootstrap functions   |
| Controller Module:   |Dependencies graphs, Execution Trees and Job Control |
| In-Memory immutable Data Store:                                 |Publish, Freeze and Versioning of data, Job indexing and Iterators |
|
<br/><br/>

# Simple Usage Example

First write a Typescript type declaration that defines your data object type:

```typescript
import { Action, action} from "../../cxctrl/mod.ts"

export type EmployeesType = {
    recId: symbol,
	employeeNumber: number;
	lastName: string;
	firstName: string;
	extension: string;
	email: string;
	officeCode: string | undefined;
	reportsTo?: number | null;
    jobTitle: string;
} 
```

The code above also imports two artifacts: 
- *Action*: This abstract Action class that defines the integration with the framework and your user defined class will inherit from Action
- *action*: A decorator used to initiate the Action class based on a supplied configuration 

Using these, we can write a user defined action class, a class that owns and manages a specific data object:
```typescript 
@action({
    name: 'Employees',
    state: [] as EmployeesType[],
    init: false,  // the default
    ctrl: 'main'  // the default
})
export class Employees extends Action<EmployeesType[]> {

    addEmployee( employee: EmployeesType) {
        this.state.push(employee)
    }

    show() {
        console.log(JSON.stringify(this.getState(this.meta.name!, -1), undefined, 2))
    }

    main() {} // This is a mandatory function - ignore for now 
}
```

The Employees class is decorated by the @action decorator:
- *name*: This is the name of the data object within the Data Store - a specific name can only be registered once.
- *state*: This is the EmployeesType[] state object that the Employees class owns the maintains and it has the mandatory name *state*.
- *init*: indicates whether this first version of the *state* is initialized with some meaningfull value by the action decorator and thus should be pushed to the Data Store.
- *ctrl*: This is the name of the Employees controller function responsible for managing the state - this is a function will be invoked automatically by the framework.

The *main()* function is mandatory, this is where you will implement/dispatch the application logic (calling whatever other functions you need).

Now Instantiate the class and then register the data object, the *state*, in the Data Store. After that fetch the date from the store and write it to console:

```typescript
let emp = await new Employees().register()
```
and add some data to the state object and publish this new state:
```typescript
emp.addEmployee({
    recId: Symbol('REC-ID'),
    employeeNumber: 1,
    lastName: "Doris",
    firstName: "Day",
    extension: "B",
    email: "doris.day@heaven.com",
    officeCode: undefined,
    reportsTo: null,
    jobTitle: "Actress",
    }
)

emp.addEmployee( {
    recId: Symbol('REC-ID'),
    employeeNumber: 2,
    lastName: "Hope",
    firstName: "Bob",
    extension: "A",
    email: "bob.hope@heaven.com",
    officeCode: undefined,
    reportsTo: 1,
    jobTitle: "BS Manager",
    } 
) 
//
// Now publish the data to the Data Store
//
await emp.publish()
//
// 
// 
emp.show()
```

Please note, that *register()* is an *async* function - if you forget to call it with *await*, it will bite you. 


## Dependencies



## Motivation

- Parameter passing


## Design goals 

Most real life programming that deals with complex systems are quite statefull, involving multiple interdependant states, state-transitions and even transformations of the state itself. 

Javascript is well posed to handle these dynamic aspects, but needs support when it comes controlling the chaos:

- A type system provided by TypeScript
- A single source of thruth within an immutable Data Store 
- Do away with coded parameter passing between 
-  - each shared and named data object is maintained by one object
- Typescript is used in order to control 

## Meta Data 


## Main Modules

Only nodes/Actions that are dirty, meaning that they have older published data that the objects/Actions they depend on, are re-executed and updated.

## How to use


- *Under Construction*


