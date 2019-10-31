require('dotenv').config()
const axios = require("axios");
const request = require("request-promise");
const mongoose = require("mongoose");
const cheerio = require("cheerio");
const housecall = require("housecall");
const Products = require("./models/product");
let date = new Date();
let dateFormat = `${date.getFullYear()}-${date.getDay()}-${date.getMonth() +
  1} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
let queue = housecall({
  concurrency: 1,
  cooldown: 700
});
mongoose.connect(`mongodb://127.0.0.1:27017/mwave-monitor`, {
    useNewUrlParser: true,
    useCreateIndex: true
})
mongoose.Promise = global.Promise;

var webHookURL = process.env.WEBHOOK


async function sendDicordWebhook(embedData) {
  try{
      queue.push(() => {
        request.post(webHookURL,{
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(embedData)
        });
      });
      // console.log("Message sent!");
  }
  catch(err)
  {
    console.log(err)
  }
}

startmonitor()

function startmonitor() {
    setTimeout(async function () {
      let p = await getProducts("https://www.mwave.me/en/kpop-store/cd?ctgr=9001")
      await checkNewItems(p);
      startmonitor()
    }, 500 )
}



async function checkNewItems(products) {
  try {
    for (let i in products) {
      let found = await Products.findOne({ productTitle: products[i].productTitle });
      if (found) {
        // Check if instock still and send notif
        //console.log("Product already found")
      } else {
        console.log("New Product found: " + products[i].productTitle)
        await new Products(products[i]).save()
        let emb = newItemMsg(products[i]);
        await sendDicordWebhook(emb);
      }
    }
  } catch (err) {
    console.log(err);
  }
}

function newItemMsg(product) {
  try {
    return {
      username: "MWave Monitor",
      avatar_url: "http://m.mwave.me/static/images/cmm/mwave_sns_logo.jpg",
      embeds: [
        {
          title: `${product.productTitle}`,
          url: product.productLink,
          color: 0x228b22,
          thumbnail: {
            url: product.productImage
          },
          fields: [
            {
              name: "MEET&GREET",
              value: product.meetNgreet ? "TRUE" : "FALSE",
              inline: true
            },
            {
              name: "Group",
              value: product.productGroup,
              inline: true
            },
            {
              name: "Price",
              value: product.productPrice,
              inline: true
            }
          ],
          footer: {
            icon_url:
              "http://m.mwave.me/static/images/cmm/mwave_sns_logo.jpg",
            text: "~Woof~#1001"
          },
          timestamp: new Date()
        }
      ]
    };
  } catch (err) {
    console.log(err);
  }
}

function goDetail(prodCd, ctgr, flashYn) {
  // Returns product link
  // https://www.mwave.me/en/kpop-store/prod/detail?prodCd=MNG00317&ctgr=9001
  if (flashYn == "Y") {
    let ctgrInput = ctgr.split(",")[0];
    return `https://www.mwave.me/en/kpop-store/prod/detail?prodCd=${prodCd}&ctgr=${ctgrInput}`;
  } else {
    return `https://www.mwave.me/en/kpop-store/prod/detail?prodCd=${prodCd}&ctgr=${ctgr}`;
  }
}

async function getProducts(page) {
  try {
    let res = await request({
      url: page,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.90 Safari/537.36"
      }
    });
    let products = [];
    let $ = cheerio.load(res);
    $("ul.goods_list_type01").find("li")
      .each((i, e) => {
        //let instock = $(e).attr("class") ? true : false;
        let meetNgreet =
          $(e)
            .find("div.info_box")
            .find("span.txt_pink")
            .text()
            .trim() === "MEET&GREET"
            ? true
            : false;
        let productTitle = $(e)
          .find("div.info_box")
          .find("a.title")
          .text()
          .trim();
        let productPrice = $(e)
          .find("div.info_box")
          .find("span.price")
          .text()
          .trim();
        let productImage = 'https://www.mwave.me/' + $(e)
          .find("div.img_box")
          .find("a")
          .find("img")
          .attr("src");
        let productGroup = $(e)
          .find("div.info_box")
          .find("span.name")
          .text()
          .trim();
        let rawProductDetails = $(e)
          .find("div.img_box")
          .find("a")
          .attr("href");
        rawProductDetails = rawProductDetails.substring(
          rawProductDetails.indexOf("(") + 1,
          rawProductDetails.length - 1
        );
        rawProductDetails = rawProductDetails.split(",");
        let prodCd = rawProductDetails[0].substring(
          1,
          rawProductDetails[0].length - 1
        );
        let ctgr = rawProductDetails[1].substring(
          1,
          rawProductDetails[1].length - 1
        );
        let flashYn = rawProductDetails[2].substring(
          1,
          rawProductDetails[2].length - 1
        );
        let productLink = goDetail(prodCd, ctgr, flashYn);
        let product = {
          //instock,
          productTitle,
          productPrice,
          productImage,
          productGroup,
          productLink,
          meetNgreet
        };
        products.push(product);
      });
    return products;
  } catch (err) {
    console.log(err);
  }
}
