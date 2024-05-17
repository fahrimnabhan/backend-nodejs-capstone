const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const router = express.Router()
const connectToDatabase = require('../models/db')
const logger = require('../logger')

// Define the upload directory path
const directoryPath = 'public/images'

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, directoryPath); // Specify the upload directory
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Use the original file name
  }
})

const upload = multer({ storage: storage });

// Get all secondChanceItems
router.get('/', async (req, res, next) => {
  try {
    const db = await connectToDatabase()
    const collection = db.collection('secondChanceItems')
    const secondChanceItems = await collection.find({}).toArray()
    res.json(secondChanceItems)
  } catch (e) {
    logger.error('Something went wrong', e)
    next(e)
  }
})

// Get a single secondChanceItem by ID
router.get('/:id', async (req, res, next) => {
  try {
    const db = await connectToDatabase()
    const collection = db.collection('secondChanceItems')
    const id = req.params.id
    const secondChanceItem = await collection.findOne({ id: id })
    if (!secondChanceItem) {
      return res.status(404).send('secondChanceItem not found')
    }
    res.json(secondChanceItem)
  } catch (e) {
    logger.error('Error fetching item', e)
    next(e)
  }
})

// Add a new item
router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    const db = await connectToDatabase()
    const collection = db.collection('secondChanceItems')
    const lastItemQuery = await collection.find().sort({ id: -1 }).limit(1).toArray()
    let secondChanceItem = req.body
    if (lastItemQuery.length > 0) {
      secondChanceItem.id = (parseInt(lastItemQuery[0].id) + 1).toString()
    } else {
      secondChanceItem.id = '1'
    }
    secondChanceItem.date_added = Math.floor(new Date().getTime() / 1000)
    const newItem = await collection.insertOne(secondChanceItem)
    logger.info('Item added successfully', newItem)
    res.status(201).json(newItem)
  } catch (e) {
    logger.error('Error adding item', e)
    next(e)
  }
});

// Update an existing item
router.put('/:id', async (req, res, next) => {
  try {
    const db = await connectToDatabase()
    const collection = db.collection('secondChanceItems')
    const id = req.params.id
    const secondChanceItem = await collection.findOne({ id })
    if (!secondChanceItem) {
      logger.error('secondChanceItem not found')
      return res.status(404).json({ error: 'secondChanceItem not found' })
    }
    secondChanceItem.category = req.body.category
    secondChanceItem.condition = req.body.condition
    secondChanceItem.age_days = req.body.age_days
    secondChanceItem.description = req.body.description
    secondChanceItem.age_years = Number((secondChanceItem.age_days / 365).toFixed(1))
    secondChanceItem.updatedAt = new Date()
    const updateResult = await collection.findOneAndUpdate(
      { id },
      { $set: secondChanceItem },
      { returnDocument: 'after' }
    )
    if (updateResult.value) {
      res.json({ uploaded: 'success' })
    } else {
      res.json({ uploaded: 'failed' })
    }
  } catch (e) {
    logger.error('Error updating item', e)
    next(e)
  }
})

// Delete an existing item
router.delete('/:id', async (req, res, next) => {
  try {
    const db = await connectToDatabase()
    const collection = db.collection('secondChanceItems')
    const id = req.params.id
    const secondChanceItem = await collection.findOne({ id })
    if (!secondChanceItem) {
      logger.error('secondChanceItem not found')
      return res.status(404).json({ error: 'secondChanceItem not found' })
    }
    await collection.deleteOne({ id })
    res.json({ deleted: 'success' })
  } catch (e) {
    logger.error('Error deleting item', e)
    next(e)
  }
})

module.exports = router
