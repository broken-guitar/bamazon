// load node module dependencies 
const inquirer = require("inquirer");
const mysql = require("mysql");
const consoleTable = require("console.table");

const bamazonDb = mysql.createConnection({
    host: "localhost",
    port: 3306,
    user: "root",
    password: "password",
    database: "bamazon"
});

var productIds = [];

inputProduct = [
    {
        type: "number",
        name: "productId",
        message: "Enter the id of a product to buy:",
        default: 1,
        validate: val => {
           // validate user input is a number and is a product id in inventory
            if (!isNaN(val) && productIds.indexOf(val) >= 0) {
               return true;
            } else {
               return "Please enter the id number of a product in our catalog";
            }
        }
    },
    {
        type: "number",
        name: "productQty",
        message: "Enter quantity number of the product to buy:",
        default: 1,
        validate: val => {
            if (!isNaN(val)) {
                return true;
            } else {
                return "Please enter a number value.";
            }
        }
    }
];

// >>>>> START <<<<<

bamazonDb.connect(err => {
    if (err) {
        console.error("error connecting: " + err.stack);
        return;
    }
    console.log("connected as id " + bamazonDb.threadId);
});

saleProduct();

// ***** FUNCTIONS *****

function saleProduct() {
    bamazonDb.query("SELECT * FROM products;", (err, res) => {
        // * note: res = array of rows as objects
        if (err) throw err;
        
        // output the products table to console
        console.table(res);
        
        // store all product ids in a global array (once) for validation on user input later
        if (productIds.length <= 0) productIds = res.map(p => p.id) 
        
        // prompt user for product input
        inquirer
        .prompt(inputProduct)
        .then((answers) => {
            let inputId = answers.productId;
            let inputQuantity = answers.productQty;
            bamazonDb.query("SELECT * FROM products WHERE ?", [{id: inputId}], (err, res) => {
                if (err) throw err;
                let stockQuantity = res[0].stock_quantity;
                let stockPrice = res[0].price;
                
                // determine if there's enough product in stock to make the order
                if (inputQuantity > res[0].stock_quantity) {
                    console.log("There is not enough product in stock! Your order has not been placed.\nPlease revise our order.")
                    return saleProduct(); // return to product selection prompt
                } else {
                    let newQuantity = stockQuantity - inputQuantity;
                    // update the database with the new product quantity
                    bamazonDb.query("UPDATE products SET ?, ? WHERE ?", [
                        {stock_quantity: newQuantity}, {product_sales: stockPrice * inputQuantity}, {id: res[0].id}
                    ],(err, result) => {
                            if (err) throw err;
                        }
                    );
                    // show total cost to user
                    console.log("\nYour order total is $" + answers.productQty * res[0].price + "\n");
                    inquirer
                        .prompt({type: "confirm", name: "keepShopping", message: "Would you like to place another order?", default: "true"})
                        .then(answers => {
                            if (answers.keepShopping) {
                                saleProduct();
                            } else {
                                console.log("\nThank you for visiting. Have a nice day!");
                                closeApp();
                            }
                        });
                } // end if
            });
        });
    });
};


// close connect and exit
function closeApp() {
    bamazonDb.end();
    process.exit();
};
