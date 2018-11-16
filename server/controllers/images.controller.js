const nodeWebcam = require('node-webcam');
const vision = require('@google-cloud/vision');
const path = require('path');
const fs = require('fs');
const detectBook = require('./BookDetection/handleDetectionData');
const fetchData = require('./BookDetection/bookDetection');

const client = new vision.ImageAnnotatorClient({
  keyFilename: `${__dirname}/../../googleKey.json`,
});

const createImageName = () => {
  const dir = path.join(__dirname, '../images/');
  const newName = Date.now();
  return `${dir + newName}.jpg`;
};

const imageToBase64 = (file) => {
  const image = fs.readFileSync(file);
  return new Buffer.from(image).toString('base64'); // eslint-disable-line new-cap
};

let image = createImageName();

const transformData = (values, imageInBase64) => {
  const collection = {
    labels: [],
    text: [],
    imageName: '',
    imageInBase64: '',
    book: '',
  };
  const labelsArray = [];
  const textArray = [];

  values.forEach((value) => {
    value.map((item) => {
      item.labelAnnotations.map(label => labelsArray.push(label.description));
      item.textAnnotations.map(text => textArray.push(text.description));
      return null;
    });
  });
  collection.text = textArray;
  collection.imageName = image.replace(/^\D+/g, '');
  collection.imageInBase64 = imageInBase64;
  collection.labels = labelsArray;
  collection.book = null;
  return collection;
};

const Capture = (res) => {
  image = createImageName();
  // to take picture from external web cam add name of device  as parameter to nodeWebcam.create({})
  const anotherCam = nodeWebcam.create();

  anotherCam.capture(image, async (err) => {
    if (err) {
      console.error(err);
    } else {
      try {
        const promises = [
          client.labelDetection(image),
          client.textDetection(image),
        ];
        const values = await Promise.all(promises);
        const imageInBase64 = imageToBase64(image);
        const responseData = transformData(values, imageInBase64);

        const responseText = responseData.text;
        const bookData = detectBook.filter(responseText);


        if (bookData) {
          console.log('in bookData');
          const finalBook = await fetchData(bookData);
          console.log(finalBook);
        }


        res.send(responseData);
      } catch (error) {
        res.send(error);
      }
    }
  });
};

const Send = (res) => {
  res.sendFile(image);
};

const Delete = (res, imageName) => {
  const dir = path.join(__dirname, '../images/');
  fs.unlink(dir + imageName, (err) => {
    if (err) {
      res.send(err);
    }
  });
  res.sendStatus(200);
};


module.exports = {
  Capture, Send, Delete, transformData,
};
