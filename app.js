const express = require("express");
const bodyParser = require("body-parser");
const date = require(__dirname + "/date.js");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// mongoose.connect("mongodb://localhost:27017/TodoDB");
mongoose.connect("mongodb+srv://admin-utsav:1234567u@cluster0.qdjscws.mongodb.net/todolistDB");

var items = [];
var itemsId = [];
var customListNames = [];
var listTitle = "";

const itemSchema = new mongoose.Schema({
  name: String
});
const Item = mongoose.model("item", itemSchema);

const newListSchema = new mongoose.Schema({
  listName: String,
  listItems: [itemSchema]
});
var NewList = mongoose.model("list", newListSchema);


// function to Insert default items if the DB is empty
var defaultItems = [];
function insertDefaults() {
  const item1 = new Item({
    name: "Welcome to your todo list!"
  })
  const item2 = new Item({
    name: "Hit the + button to add a new item."
  })
  const item3 = new Item({
    name: "<-- Hit this to delete an item."
  })

  defaultItems = [item1, item2, item3];
}
insertDefaults();

// function to extract data from DB 
var found;
async function extractData(ParamModel) {
  items = [];
  found = await ParamModel.find({});
  for (var i = 0; i < found.length; i++) {
    items[i] = found[i].name;
    itemsId[i] = found[i]._id;
  }
}

async function extractDataNewList(ParamModel, paramListName) {
  items = [];
  foundList = await ParamModel.find({ listName: paramListName });
  for (var i = 0; i < foundList[0].listItems.length; i++) {
    items[i] = foundList[0].listItems[i].name;
    itemsId[i] = foundList[0].listItems[i]._id;
  }
}

app.get("/", async function (req, res) {
  console.log("in get")

  await extractData(Item);

  // if DB is empty, fill default items
  if (items.length == 0) {
    const inserted = await Item.insertMany(defaultItems)
    res.redirect("/");
  } else {
    const day = date.getDate();
    listTitle = "Today";
    res.render("list", { ejsListTitle: listTitle, newListItems: items, dbItemsIDs: itemsId });
  }
});

app.get("/:paramList", async function (req, resp) {
  console.log("in get param")

  listTitle = _.capitalize(req.params.paramList);

  const found = await NewList.find({ listName: listTitle })

  if (found.length > 0) {
    // already there -->  
    await extractDataNewList(NewList, listTitle);

    resp.render("list", { ejsListTitle: listTitle, newListItems: items, dbItemsIDs: itemsId });
  } else {

    // new --> create new db collection and insert default elems
    const newItem = {
      listName: listTitle,
      listItems: defaultItems
    };
    const inserted = await NewList.insertMany(newItem);
    resp.redirect("/" + listTitle)
  }
});

app.get('/favicon.ico', (req, res) => res.status(204));

app.post("/", async function (req, res) {
  console.log("in post")
  const item = req.body.newItem;

  const newItem = new Item({
    name: item
  });

  listTitle = req.body.plusButton;

  if (listTitle === "Today" || listTitle === "") {
    await Item.insertMany([newItem]);
    res.redirect("/");
  } else {
    const foundList = await NewList.find({ listName: listTitle });
    if (foundList.length > 0) {
      const newListItems = foundList[0].listItems
      newListItems.push(newItem)
      await NewList.updateOne({ listName: listTitle }, { listItems: newListItems })
    } else {
      res.redirect("/" + listTitle);
    }
    res.redirect("/" + listTitle);
  }
});

app.post("/delete", async function (req, resp) {
  console.log("in delete");

  const deletedItemID = req.body.checkboxOn
  const deletedItemListTitle = req.body.deletedListTitle;
  const deletedItemIndex = req.body.deletedListIndex

  if (deletedItemListTitle == "Today") {
    await Item.findByIdAndDelete(deletedItemID)

    setTimeout(function () {
      resp.redirect("/");
    }, 1000);
  } else {
    const foundList = await NewList.find({ listName: deletedItemListTitle });
    const newListItems = foundList[0].listItems
    newListItems.splice(deletedItemIndex, 1);
    await NewList.updateOne({ listName: deletedItemListTitle }, { listItems: newListItems })

    setTimeout(function () {
      resp.redirect("/" + deletedItemListTitle);
    }, 1000);
  }

});

app.listen(3000, function () {
  console.log("Server started on port 3000");
});
