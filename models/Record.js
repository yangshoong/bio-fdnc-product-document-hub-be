// models/Record.js

const mongoose = require('mongoose');

const recordSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String },
  regulation: { type: String }, // 해당 레코드가 속한 규정
  tags: [{ type: String }], // 일간, 주간, 월간, 비정기적 등
  history: [
    {
      content: String,
      editedAt: Date,
      editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
  ],
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvalStatus: { type: String, default: '대기', enum: ['대기', '승인', '반려'] },
  approvers: [
    {
      level: Number, // 1차, 2차, 3차 승인자
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      approvedAt: Date,
      status: { type: String, default: '대기', enum: ['대기', '승인', '반려'] },
    },
  ],
});

module.exports = mongoose.model('Record', recordSchema);
