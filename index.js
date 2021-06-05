const csv = require("csv-parser");
const fs = require("fs");

const ObjectsToCsv = require("objects-to-csv");

const readCsv = (path) => {
  return new Promise((resolve, reject) => {
    const results = [];
    try {
      fs.createReadStream(path)
        .pipe(csv())
        .on("data", (data) => results.push(data))
        .on("end", () => {
          resolve(results.filter((item) => Object.keys(item).length));
        });
    } catch (error) {
      reject(error);
    }
  });
};

async function run() {
  const data = await readCsv("data.csv");
  const config = await readCsv("config.csv");
  log(data);
  log(config);
  const replacers = config
    .map((item) => item.replacer && item.replacer.toLowerCase())
    .filter((item) => item && item.length);
  const postfixes = config
    .map((item) => item.postfix && item.postfix.toLowerCase().trim())
    .filter((item) => item && item.length);
  const phrase = config
    .map((item) => item.phrase && item.phrase.toLowerCase().trim())
    .filter((item) => item && item.length)[0];

  const titles = data
    .map((item) => item.title && item.title)
    .filter((item) => item && item.length);
  log(replacers);
  log(postfixes);
  log(titles);
  function replaceAllReplacers(titleObjects) {
    titleObjects.forEach((obj) => {
      let rTitle = obj.parsed;
      replacers.forEach((r) => {
        rTitle = rTitle.split(r).join("");
      });
      obj.parsed = rTitle;
    });
  }
  function stdizeSpace(titleObjects) {
    titleObjects.forEach(
      (obj) => (obj.parsed = obj.parsed.trim().replace(/ +(?= )/g, ""))
    );
  }
  function shuffle(array) {
    var currentIndex = array.length,
      temporaryValue,
      randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      // And swap it with the current element.
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }

    return array;
  }

  function generatePostfixedTitles(key, count) {
    if (count >= postfixes.length) {
      return postfixes.map((pf) => key + " " + pf);
    } else {
      const shuffledPostfixes = shuffle(postfixes);
      log(shuffledPostfixes);
      return new Array(count)
        .fill()
        .map((item, index) => key + " " + shuffledPostfixes[index]);
    }
  }

  function updateDuplicateTitles(titleObjects) {
    const count = {};
    titleObjects.forEach(function (obj) {
      const title = obj.parsed;
      count[title] = (count[title] || 0) + 1;
    });
    Object.keys(count).map((key) => {
      const titleCount = count[key];
      let titles = [];
      if (titleCount === 1) titles = [key];
      else titles = generatePostfixedTitles(key, titleCount);
      let tIdx = 0;
      titleObjects.forEach((obj) => {
        const title = obj.parsed;
        if (title === key) {
          if (tIdx < titles.length) obj.parsed = titles[tIdx++];
          else obj.parsed = "FALSE";
        }
      });
    });
  }
  function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
  function upperCaseFirstLetterInTitles(titleObjects) {
    titleObjects.forEach((obj) => {
      obj.parsed = obj.parsed
        .split(" ")
        .map((word) => capitalizeFirstLetter(word))
        .join(" ");
    });
  }
  function growTitles(titleObjects) {
    titleObjects
      .filter((obj) => obj.parsed !== "FALSE")
      .forEach((obj) => {
        const title = obj.parsed;
        obj.parsed = title.split(" ").length < 5 ? title + " " + phrase : title;
      });
  }
  const titleObjects = titles.map((title) => ({
    origin: title,
    parsed: title.toLowerCase().trim(),
  }));

  replaceAllReplacers(titleObjects);
  stdizeSpace(titleObjects);
  updateDuplicateTitles(titleObjects);
  growTitles(titleObjects);
  upperCaseFirstLetterInTitles(titleObjects);
  const csv = new ObjectsToCsv(titleObjects);

  await csv.toDisk("./output.csv");
  console.log("Done...");
}
const log = (msg) => {
  DEBUG && console.log(msg);
};
const DEBUG = false;
run();
