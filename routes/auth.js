const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // User 모델 가져오기

// 회원가입 라우트
router.post('/auth/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 이메일 중복 확인
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: '이미 사용 중인 이메일입니다.' });
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10);

    // 새 사용자 생성
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
    });

    // 사용자 저장
    await newUser.save();

    res.status(201).json({
      message: '회원가입이 완료되었습니다.',
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
      },
    });
  } catch (error) {
    console.error('회원가입 에러:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 로그인 라우트
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 이메일로 사용자 찾기
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    // 비밀번호 확인
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: '비밀번호가 일치하지 않습니다.' });
    }

    // JWT 토큰 생성
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    // 로그인 성공 시 사용자 정보와 토큰 반환
    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('로그인 에러:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 인증 미들웨어 (예시)
const requireAuth = (req, res, next) => {
  // JWT 토큰 검증 로직
  // 실제 구현에서는 토큰을 확인하고 사용자 정보를 req.user에 첨부
  next();
};

// 역할 확인 미들웨어
const requireRole = (roles) => {
  return (req, res, next) => {
    if (roles.includes(req.user.role)) {
      next();
    } else {
      res.status(403).json({ message: '권한이 없습니다.' });
    }
  };
};

// 모든 사용자 목록 조회 (관리자만 가능)
router.get('/users', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: '사용자 목록 조회 실패', error });
  }
});

// 사용자 권한 업데이트 (관리자만 가능)
router.put('/users/:id/role', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    user.role = role;
    await user.save();

    res.json({ message: '사용자 권한이 업데이트되었습니다.', user });
  } catch (error) {
    res.status(500).json({ message: '사용자 권한 업데이트 실패', error });
  }
});

module.exports = router;
