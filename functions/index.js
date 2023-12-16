const functions = require("firebase-functions");
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
require('dotenv').config()

const app = express()

// mongoose.connect(process.env.DATABASE,{
//   useNewUrlParser:true,
//   useUnifiedTopology:false
// })
// .then(()=>console.log("connect database success"))
// .catch((err) => console.log(err))

app.use(express.json())
app.use(cors())

exports.app = functions.region('asia-southeast1').https.onRequest(app)

exports.visionAPI = functions.region('asia-southeast1').https.onCall(async (data, context) => {
  const base64 = data.base64.split(",")

  const vision = require('@google-cloud/vision')
  const client = new vision.ImageAnnotatorClient({ keyFilename: './service-account.json' })
  const request = { image: { content: base64[1] } }
  const [result] = await client.textDetection(request)

  return {
    result: result
  }
})