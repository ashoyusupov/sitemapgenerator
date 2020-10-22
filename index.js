const express = require('express')
const axios = require('axios')
const { SitemapStream, streamToPromise } = require('sitemap')
const { createGzip } = require('zlib')
const { Readable } = require('stream')

const app = express()
let sitemap

app.get('/sitemap.xml', async function(req, res) {
  res.header('Content-Type', 'application/xml');
  res.header('Content-Encoding', 'gzip');
  // if we have a cached entry send it
  if (sitemap) {
    res.send(sitemap)
    return
  }

  try {
    const smStream = new SitemapStream({ hostname: 'https://nomer.uz/' })
    const pipeline = smStream.pipe(createGzip())
    

    smStream.write({ url: '/',  changefreq: 'monthly', priority: 1 })
    smStream.write({ url: '/o/UCELL/',  changefreq: 'monthly', priority: 0.9 })
    smStream.write({ url: '/o/BEELINE/',  changefreq: 'monthly', priority: 0.9 })
    smStream.write({ url: '/o/MOBIUZ/',  changefreq: 'monthly', priority: 0.9 })
    smStream.write({ url: '/o/UZMOBILE/',  changefreq: 'monthly', priority: 0.9 })
    smStream.write({ url: '/o/HUMANS/',  changefreq: 'monthly', priority: 0.9 })

    const result = await axios.get('https://nomer.uz/getall', {
      params: {
        _size: 10,
        _p: 1,
        _where: '(activeness,eq,1)',
        _sort: '-category,-createddate',
        _fields: '-',
        _tableconstruction_version: 'vertri',
        _table_name: 'numbers',
        _zeTable: 'numbers',
        _use_prefix: true,
      },
    })
    const totalPages = Math.ceil(result.data.total / 100)

    for (let page = 1; page <= totalPages; page++) {
      
      let pageResult = await axios.get('https://nomer.uz/getall', {
        params: {
          _size: 100,
          _p: page,
          _where: '(activeness,eq,1)',
          _sort: '-category,-createddate',
          _fields: '-',
          _tableconstruction_version: 'vertri',
          _table_name: 'numbers',
          _zeTable: 'numbers',
          _use_prefix: true,
        },
      })
      
      let dataPage = pageResult.data.records
      let dataLength = pageResult.data.records.length
      for (let index = 0; index < dataLength; index++) {
        let row = dataPage[index]
        smStream.write({ url: `/s/${row.number}/`,  changefreq: 'monthly',  priority: 0.7 })
        
      }
      
    }

    // pipe your entries or directly write them.
    // smStream.write({ url: '/page-3/'})    // changefreq: 'weekly',  priority: 0.5
    // smStream.write({ url: '/page-4/',   img: "http://urlTest.com" })
    /* or use
    Readable.from([{url: '/page-1'}...]).pipe(smStream)
    if you are looking to avoid writing your own loop.
    */

    // cache the response
    streamToPromise(pipeline).then(sm => sitemap = sm)
    // make sure to attach a write stream such as streamToPromise before ending
    smStream.end()
    // stream write the response
    pipeline.pipe(res).on('error', (e) => {throw e})
  } catch (e) {
    console.error(e)
    res.status(500).end()
  }
})

app.listen(5030, () => {
  console.log('listening')
});