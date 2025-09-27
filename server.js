const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quan-ly-thu-chi', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Kết nối MongoDB thành công!');
});

// Models
const transactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['thu', 'chi'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  date: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Transaction = mongoose.model('Transaction', transactionSchema);

// API Routes

// Lấy tất cả giao dịch
app.get('/api/transactions', async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ date: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi lấy dữ liệu', error: error.message });
  }
});

// Thêm giao dịch mới
app.post('/api/transactions', async (req, res) => {
  try {
    const { type, amount, category, description, date } = req.body;
    
    const transaction = new Transaction({
      type,
      amount,
      category,
      description,
      date: date || new Date()
    });
    
    await transaction.save();
    res.status(201).json(transaction);
  } catch (error) {
    res.status(400).json({ message: 'Lỗi khi thêm giao dịch', error: error.message });
  }
});

// Cập nhật giao dịch
app.put('/api/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const transaction = await Transaction.findByIdAndUpdate(id, updateData, { new: true });
    
    if (!transaction) {
      return res.status(404).json({ message: 'Không tìm thấy giao dịch' });
    }
    
    res.json(transaction);
  } catch (error) {
    res.status(400).json({ message: 'Lỗi khi cập nhật giao dịch', error: error.message });
  }
});

// Xóa giao dịch
app.delete('/api/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const transaction = await Transaction.findByIdAndDelete(id);
    
    if (!transaction) {
      return res.status(404).json({ message: 'Không tìm thấy giao dịch' });
    }
    
    res.json({ message: 'Xóa giao dịch thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi xóa giao dịch', error: error.message });
  }
});

// Thống kê
app.get('/api/stats', async (req, res) => {
  try {
    const { month, year } = req.query;
    let dateFilter = {};
    
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      dateFilter = {
        date: {
          $gte: startDate,
          $lte: endDate
        }
      };
    }
    
    const thuStats = await Transaction.aggregate([
      { $match: { type: 'thu', ...dateFilter } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const chiStats = await Transaction.aggregate([
      { $match: { type: 'chi', ...dateFilter } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const tongThu = thuStats[0]?.total || 0;
    const tongChi = chiStats[0]?.total || 0;
    const soDu = tongThu - tongChi;
    
    res.json({
      tongThu,
      tongChi,
      soDu
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi lấy thống kê', error: error.message });
  }
});

// Serve static files
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.listen(PORT, () => {
  console.log(`Server đang chạy trên port ${PORT}`);
});