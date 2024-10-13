// 백엔드
// server.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose'); // mongoose 모듈 추가

const app = express();

// 미들웨어 설정
app.use(cors());
app.use(express.json());

// MongoDB 연결 설정
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB 연결 성공');
  })
  .catch((err) => {
    console.error('MongoDB 연결 에러:', err);
  });

// 사용자 인증 라우트 설정
const authRoutes = require('./routes/auth');
app.use('/api', authRoutes);

// 헬스 체크 엔드포인트 추가
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// 서버 시작
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});
