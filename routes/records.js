// routes/records.js

const express = require('express');
const router = express.Router();
const Record = require('../models/Record');
const { requireAuth, requireRole } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// 입력 유효성 검사 미들웨어
const validateRecord = [
  body('title').notEmpty().withMessage('제목은 필수입니다.'),
  body('content').notEmpty().withMessage('내용은 필수입니다.'),
  body('regulation').optional(),
  body('tags').optional().isArray(),
];

// 레코드 생성
router.post('/', requireAuth, validateRecord, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const record = new Record({
      ...req.body,
      createdBy: req.user.id,
    });
    await record.save();
    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ message: '레코드 생성 실패', error: error.message });
  }
});

// 레코드 목록 조회 (필터링 포함)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { regulation, tags, search } = req.query;
    let query = {};

    if (regulation) {
      query.regulation = regulation;
    }

    if (tags) {
      query.tags = { $all: tags.split(',') };
    }

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    const records = await Record.find(query).populate('createdBy');
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: '레코드 조회 실패', error });
  }
});

// 레코드 상세 조회
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const record = await Record.findById(req.params.id).populate('createdBy');
    res.json(record);
  } catch (error) {
    res.status(500).json({ message: '레코드 조회 실패', error });
  }
});

// 레코드 수정
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const record = await Record.findById(req.params.id);

    // 히스토리에 이전 내용 저장
    record.history.push({
      content: record.content,
      editedAt: new Date(),
      editedBy: req.user.id,
    });

    // 내용 업데이트
    record.title = req.body.title || record.title;
    record.content = req.body.content || record.content;
    record.tags = req.body.tags || record.tags;
    record.regulation = req.body.regulation || record.regulation;

    await record.save();
    res.json(record);
  } catch (error) {
    res.status(500).json({ message: '레코드 수정 실패', error });
  }
});

// 레코드 삭제
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await Record.findByIdAndDelete(req.params.id);
    res.json({ message: '레코드가 삭제되었습니다.' });
  } catch (error) {
    res.status(500).json({ message: '레코드 삭제 실패', error });
  }
});

// 승인 요청
router.post('/:id/approve', requireAuth, 
  body('status').isIn(['승인', '반려']).withMessage('유효한 승인 상태가 아닙니다.'),
  async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const record = await Record.findById(req.params.id);

    if (!record) {
      return res.status(404).json({ message: '레코드를 찾을 수 없습니다.' });
    }

    // 승인자 레벨 결정 로직 개선
    let approverLevel;
    switch(req.user.role) {
      case 'admin':
        approverLevel = 3;
        break;
      case 'manager':
        approverLevel = 2;
        break;
      default:
        approverLevel = 1;
    }

    // 승인 상태 업데이트
    const approverIndex = record.approvers.findIndex(a => a.level === approverLevel);
    if (approverIndex !== -1) {
      record.approvers[approverIndex].status = req.body.status;
      record.approvers[approverIndex].approvedAt = new Date();
      record.approvers[approverIndex].user = req.user.id;
    } else {
      record.approvers.push({
        level: approverLevel,
        user: req.user.id,
        approvedAt: new Date(),
        status: req.body.status
      });
    }

    // 모든 승인자가 승인했는지 확인
    const allApproved = record.approvers.every(a => a.status === '승인');
    if (allApproved) {
      record.approvalStatus = '승인';
    } else if (req.body.status === '반려') {
      record.approvalStatus = '반려';
    }

    await record.save();
    res.json(record);
  } catch (error) {
    res.status(500).json({ message: '승인 처리 실패', error: error.message });
  }
});

module.exports = router;
