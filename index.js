const puppeteer = require('puppeteer');
const fs = require('fs');

const {
  basename,
  resolve,
  relative
} = require('path');

const {
  readFileSync
} = require('fs');


async function printForm(page, options) {

  const {
    input,
    outputs,
    footer,
    title = true,
  } = options;

  const formJSON = readFileSync(input, 'utf8');
  const dataJSON = (function() {
    try {
      return readFileSync(input.replace(/\.form$/, '.json'), 'utf8');
    } catch (e) {
      return '{}';
    }
  })();

  const formTitle = title === false ? false : (
    title.length ? title : basename(input)
  );

  await page.goto(`file://${__dirname}/skeleton.html`);

  const viewerScript = relative(__dirname, require.resolve('@bpmn-io/form-js')).replace("index.cjs", 'form-viewer.umd.js');
  const viewerCSS = relative(__dirname, require.resolve('@bpmn-io/form-js')).replace("index.cjs", 'assets/form-js.css');

  const desiredViewport_ = await page.evaluate(async function(formJSON, dataJSON, options) {

    const {
      viewerScript,
      viewerCSS,
      ...openOptions
    } = options;

    await loadScript(viewerScript);
    await loadCSS(viewerCSS);

    // returns desired viewport
    return openForm(formJSON, dataJSON, openOptions);
  }, formJSON, dataJSON, {
    title: formTitle,
    viewerScript,
    viewerCSS,
    footer
  });;
  const desiredViewport = JSON.parse(desiredViewport_);

  for (const output of outputs) {

    console.log(`writing ${output}`);

    if (output.endsWith('.png')) {
      await page.screenshot({
        path: output,
        clip: {
          x: 0,
          y: 0,
          width: desiredViewport.width,
          height: desiredViewport.height + 40
        }
      });
    } else
    if (output.endsWith('.html')) {

      const html = await page.evaluate(() => toHTML());

      fs.writeFileSync(output, Buffer.from(html, 'utf8'), 'utf8');
    } else {
      console.error(`Unknown output file format: ${output}`);
    }
  }

}


async function withPage(fn) {
  let browser;

  try {
    browser = await puppeteer.launch();

    await fn(await browser.newPage());
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}


async function convertAll(conversions, options={}) {

  const {
    footer,
    title,
  } = options;

  await withPage(async function(page) {

    for (const conversion of conversions) {

      const {
        input,
        outputs
      } = conversion;

      await printForm(page, {
        input,
        outputs,
        title,
        footer,
      });
    }

  });

}

module.exports.convertAll = convertAll;

async function convert(input, output) {
  return await convertAll([
    {
      input,
      outputs: [ output ]
    }
  ]);
}


module.exports.convert = convert;
