# Dynamic Rest

This is an example application that:

- Reads an Mysql dumpfile database export that is found in the ./data directory
- Parses the Mysql table definitions and maps the Data Types to typescript
- Parses the Mysql dumpfile Insert statements to comma separated files 
- Generates an action class to handle and load data for each of the Mysql tables
- Generates a app.test.ts test for the generated classes that also starts a very simple REST Oak web server

Please note, that this is NOT production code, but rather a toy example showing how Graph-Ioc can be utilized.

To generate the code and data you should first run:

```
cd examples/dynamicRest
deno test -A --config ../../tsconfig.json 01_app.test.ts      
```
This will generate code and data files in the "resources" directory.

To run this code and start the web server, use the command:

```
deno test -A --config ../../tsconfig.json resources/app.test.ts
```
This will produce the the output, showing each a the generated state objects: 
```
Checking: Products
Products.state has 110 rows
Checking: Productlines
Productlines.state has 7 rows
Checking: Payments
Payments.state has 273 rows
Checking: Orders
Orders.state has 326 rows
Checking: Orderdetails
Orderdetails.state has 2996 rows
Checking: Offices
Offices.state has 7 rows
Checking: Employees
Employees.state has 23 rows
Checking: Customers
Customers.state has 122 rows
```
You can now query the REST api in a web browser, i.e.:
```
http://localhost:9999/Employees
http://localhost:9999/Offices

etc...
```
