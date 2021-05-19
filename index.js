const csv = require('csv-parser');
const fs = require('fs');

const ObjectsToCsv = require('objects-to-csv');

const readCsv = (path) => {
  return new Promise((resolve, reject) => {
    const results = [];
    try {
      fs.createReadStream(path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
          resolve(results.filter((item) => Object.keys(item).length));
        });
    } catch (error) {
      reject(error);
    }
  });
};

async function run() {
  const data = await readCsv('data.csv');
  const config = await readCsv('config.csv');
  log(data);
  log(config);
  const replacers = config
    .map((item) => item.replacer && item.replacer.toLowerCase().trim())
    .filter((item) => item && item.length);
  const postfixes = config
    .map((item) => item.postfix && item.postfix.toLowerCase().trim())
    .filter((item) => item && item.length);
  const phrase = config
    .map((item) => item.phrase && item.phrase.toLowerCase().trim())
    .filter((item) => item && item.length)[0];

  const titles = data
    .map((item) => item.title && item.title.toLowerCase().trim())
    .filter((item) => item && item.length);
  log(replacers);
  log(postfixes);
  log(titles);
  function replaceAllReplacers(titles) {
    return titles.map((title) => {
      let rTitle = title;
      replacers.forEach((r) => {
        rTitle = rTitle.split(r).join('');
      });
      return rTitle;
    });
  }
  function stdizeSpace(titles) {
    return titles.map((title) => title.trim().replace(/ +(?= )/g, ''));
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
      return postfixes.map((pf) => key + ' ' + pf);
    } else {
      const shuffledPostfixes = shuffle(postfixes);
      log(shuffledPostfixes);
      return new Array(count)
        .fill()
        .map((item, index) => key + ' ' + shuffledPostfixes[index]);
    }
  }

  function updateDuplicateTitles(titles) {
    const count = {};
    titles.forEach(function (i) {
      count[i] = (count[i] || 0) + 1;
    });
    const newTitles = Object.keys(count).map((key) => {
      const titleCount = count[key];
      if (titleCount === 1) return key;
      return generatePostfixedTitles(key, titleCount);
    });
    return newTitles.flat();
  }
  function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
  function upperCaseFirstLetterInTitles(titles) {
    return titles.map((title) => {
      return title
        .split(' ')
        .map((word) => capitalizeFirstLetter(word))
        .join(' ');
    });
  }
  function growTitles(titles) {
    return titles.map((title) =>
      title.split(' ').length < 5 ? title + ' ' + phrase : title
    );
  }
  const s1Titles = replaceAllReplacers(titles);
  const s2Titles = stdizeSpace(s1Titles);
  const s3Titles = updateDuplicateTitles(s2Titles);
  const s4Titles = growTitles(s3Titles);
  const s5Titles = upperCaseFirstLetterInTitles(s4Titles);
  const csv = new ObjectsToCsv(
    s5Titles.map((title) => ({
      title,
    }))
  );

  await csv.toDisk('./output.csv');
  console.log('Done...');
}
const log = (msg) => {
  DEBUG && console.log(msg);
};
const DEBUG = false;
run();
