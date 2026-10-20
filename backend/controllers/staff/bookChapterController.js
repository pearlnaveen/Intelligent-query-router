import { BookChapter, BookChapterAuthor, User, sequelize } from '../../models/index.js';
import { parseBulkRecords } from '../../utils/bulkUploadHelper.js';
import { normalizeToDbDate } from '../../utils/dateHelper.js';

// validation enums
const validPublicationTypes = ['journal', 'book_chapter', 'conference'];
const validIndexTypes = ['Scopus', 'SCI', 'SCIE', 'SSCI', 'A&HCI', 'ESCI', 'UGC CARE', 'Other'];

// helper to parse authors field
const parseAuthors = (authors) => {
  if (!authors) return [];
  if (Array.isArray(authors)) return authors.map(a => String(a).trim()).filter(Boolean);
  if (typeof authors === 'string') {
    try {
      const parsed = JSON.parse(authors);
      if (Array.isArray(parsed)) return parsed.map(a => String(a).trim()).filter(Boolean);
    } catch (e) {
      // ignore
    }
    return authors.split(',').map(a => a.trim()).filter(a => a.length > 0);
  }
  return [];
};

// GET /book-chapters
export const getAllBookChapters = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.Userid || req.body.Userid;
    if (!userId) {
      return res.status(401).json({ message: 'User ID not found' });
    }

    const rows = await BookChapter.findAll({
      where: { Userid: userId },
      include: [
        { model: BookChapterAuthor, as: 'chapterAuthors', attributes: ['id', 'author_name', 'author_order'] },
      ],
      order: [['publication_date', 'DESC'], ['id', 'DESC']],
    });

    const result = rows.map(r => {
      const j = r.toJSON();
      const authorArray = Array.isArray(j.chapterAuthors) && j.chapterAuthors.length > 0
        ? j.chapterAuthors.sort((a, b) => a.author_order - b.author_order).map(a => a.author_name)
        : parseAuthors(j.authors);
      return {
        ...j,
        authors: authorArray.join(', '),
        authorsList: authorArray,
      };
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching book chapters:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /book-chapters/:id
export const getBookChapterById = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.Userid || req.body.Userid;
    if (!userId) {
      return res.status(401).json({ message: 'User ID not found' });
    }

    const record = await BookChapter.findOne({
      where: { id: req.params.id, Userid: userId },
      include: [
        { model: BookChapterAuthor, as: 'chapterAuthors', attributes: ['id', 'author_name', 'author_order'] },
      ],
    });

    if (!record) {
      return res.status(404).json({ message: 'Book chapter not found' });
    }

    const j = record.toJSON();
    const authorArray = Array.isArray(j.chapterAuthors) && j.chapterAuthors.length > 0
      ? j.chapterAuthors.sort((a, b) => a.author_order - b.author_order).map(a => a.author_name)
      : parseAuthors(j.authors);

    res.status(200).json({ ...j, authors: authorArray.join(', '), authorsList: authorArray });
  } catch (error) {
    console.error('Error fetching book chapter:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /book-chapters
export const createBookChapter = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      publication_type,
      publication_name,
      publication_title,
      authors,
      published_month,
      published_year,
      index_type,
      doi,
      citations,
      publisher,
      volume_no,
      page_no,
      issue_no,
      publication_date,
      impact_factor,
      publication_link,
    } = req.body;

    if (!publication_title) {
      await t.rollback();
      return res.status(400).json({
        message: 'Required field missing: Title of the Paper',
      });
    }

    const index_typeVal = index_type || 'Scopus';
    const authorArray = parseAuthors(authors);
    if (authorArray.length === 0) authorArray.push('Faculty Author');

    const yearVal = published_year ? parseInt(published_year, 10) : (publication_date ? new Date(publication_date).getFullYear() : new Date().getFullYear());
    const monthVal = published_month || (publication_date ? new Date(publication_date).toLocaleString('default', { month: 'Long' }) : 'January');
    
    let dateVal = publication_date;
    if (!dateVal && yearVal) {
      const monthMap = { january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12' };
      const mm = monthMap[String(monthVal).trim().toLowerCase()] || '01';
      dateVal = `${yearVal}-${mm}-01`;
    }

    const userId = req.user?.userId || req.user?.Userid || req.body.Userid;
    if (!userId) {
      await t.rollback();
      return res.status(401).json({ message: 'User ID not found' });
    }

    const record = await BookChapter.create({
      Userid: userId,
      publication_type: publication_type || 'journal',
      publication_name: publication_name || null,
      publication_title,
      authors: authorArray.join(', '),
      published_month: monthVal,
      published_year: yearVal,
      index_type: index_typeVal,
      doi: doi || null,
      citations: citations ? parseInt(citations, 10) : 0,
      publisher: publisher || null,
      volume_no: volume_no || null,
      page_no: page_no || null,
      issue_no: issue_no || null,
      publication_date: dateVal || new Date().toISOString().split('T')[0],
      impact_factor: impact_factor ? parseFloat(impact_factor) : null,
      publication_link: publication_link || null,
    }, { transaction: t });

    if (authorArray.length > 0) {
      await BookChapterAuthor.bulkCreate(
        authorArray.map((name, idx) => ({
          book_chapter_id: record.id,
          author_name: name,
          author_order: idx + 1,
        })),
        { transaction: t }
      );
    }

    await t.commit();
    res.status(201).json({ message: 'Publication created', id: record.id });
  } catch (error) {
    await t.rollback();
    console.error('Error creating publication:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'Duplicate entry' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const parseBackendDate = (val) => {
  return normalizeToDbDate(val) || new Date().toISOString().split('T')[0];
};

const getFieldVal = (rec, keys) => {
  if (!rec || typeof rec !== 'object') return null;
  for (const k of keys) {
    if (rec[k] !== undefined && rec[k] !== null && String(rec[k]).trim() !== '') {
      return rec[k];
    }
  }
  return null;
};

export const bulkCreateBookChapters = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const userId = req.user?.userId || req.user?.Userid;
    if (!userId) {
      await t.rollback();
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const records = parseBulkRecords(req);
    if (!Array.isArray(records) || records.length === 0) {
      await t.rollback();
      return res.status(400).json({ message: 'No valid records provided' });
    }

    const monthMap = { january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12' };

    const createdRecords = [];
    for (const rec of records) {
      const rawAuthors = getFieldVal(rec, ['authors', 'list_of_authors', 'List of Authors (as per the paper)', 'List of Authors', 'author', 'Author', 'Authors']) || 'Staff Author';
      const authorArray = parseAuthors(rawAuthors);
      if (authorArray.length === 0) authorArray.push('Staff Author');

      const rawTitle = getFieldVal(rec, ['publication_title', 'title_of_the_paper', 'Title of the Paper', 'title', 'Title', 'paper_title', 'Paper Title']);
      const titleVal = rawTitle ? String(rawTitle).trim() : 'Untitled Publication';

      const rawType = getFieldVal(rec, ['publication_type', 'publicationType', 'Publication Type', 'type', 'Type']) || 'journal';
      const rawMonth = getFieldVal(rec, ['published_month', 'Published Month', 'published_month', 'month', 'Month', 'publication_month']) || 'January';
      const rawYear = getFieldVal(rec, ['published_year', 'Published Year', 'published_year', 'year', 'Year', 'publication_year']);
      const rawDoi = getFieldVal(rec, ['doi', 'DOI', 'Doi']);
      const rawImpact = getFieldVal(rec, ['impact_factor', 'Impact Factor', 'impactFactor', 'ImpactFactor']);
      const rawIndex = getFieldVal(rec, ['index_type', 'SCI / Scopus Indexed / WoS', 'sci_scopus_indexed_wos', 'Index Type', 'indexType', 'Indexing']) || 'Scopus';
      const rawVolume = getFieldVal(rec, ['volume_no', 'Volume No.', 'Volume No', 'volumeNo', 'volume']);
      const rawPage = getFieldVal(rec, ['page_no', 'Page No.', 'Page No', 'pageNo', 'pages']);
      const rawIssue = getFieldVal(rec, ['issue_no', 'Issue No.', 'Issue No', 'issueNo', 'issue']);
      const rawCitations = getFieldVal(rec, ['citations', 'no_of_citations', 'No. of Citations', 'No of Citations', 'citationCount']) || 0;
      const rawPublisher = getFieldVal(rec, ['publisher', 'Publisher']);
      const rawLink = getFieldVal(rec, ['publication_link', 'Publication Link', 'publicationLink', 'link', 'URL']);
      const rawDate = getFieldVal(rec, ['publication_date', 'Publication Date', 'date', 'Date']);

      const pubDate = parseBackendDate(rawDate);
      const yearVal = rawYear ? parseInt(rawYear, 10) : new Date(pubDate).getFullYear();
      const monthVal = String(rawMonth).trim();

      let dateVal = pubDate;
      if (yearVal && monthVal) {
        const mm = monthMap[String(monthVal).trim().toLowerCase()] || '01';
        dateVal = `${yearVal}-${mm}-01`;
      }

      const record = await BookChapter.create({
        Userid: userId,
        publication_type: String(rawType).trim(),
        publication_name: rec.publication_name ? String(rec.publication_name).trim() : null,
        publication_title: titleVal,
        authors: authorArray.join(', '),
        published_month: monthVal,
        published_year: yearVal,
        index_type: String(rawIndex).trim(),
        doi: rawDoi ? String(rawDoi).trim() : null,
        citations: Number(rawCitations) || 0,
        publisher: rawPublisher ? String(rawPublisher).trim() : null,
        volume_no: rawVolume ? String(rawVolume).trim() : null,
        page_no: rawPage ? String(rawPage).trim() : null,
        issue_no: rawIssue ? String(rawIssue).trim() : null,
        publication_date: dateVal,
        impact_factor: rawImpact ? String(rawImpact).trim() : null,
        publication_link: rawLink ? String(rawLink).trim() : null,
      }, { transaction: t });

      if (authorArray.length > 0) {
        await BookChapterAuthor.bulkCreate(
          authorArray.map((name, idx) => ({
            book_chapter_id: record.id,
            author_name: name,
            author_order: idx + 1,
          })),
          { transaction: t }
        );
      }
      createdRecords.push(record);
    }

    await t.commit();
    res.status(201).json({
      success: true,
      message: `Successfully uploaded ${createdRecords.length} publication records`,
      data: createdRecords,
    });
  } catch (error) {
    await t.rollback();
    console.error('Error bulk creating publication records:', error);
    res.status(500).json({ message: 'Server error while bulk creating publication records', error: error.message });
  }
};

// PUT /book-chapters/:id
export const updateBookChapter = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const {
      publication_type,
      publication_name,
      publication_title,
      authors,
      published_month,
      published_year,
      index_type,
      doi,
      citations,
      publisher,
      volume_no,
      page_no,
      issue_no,
      publication_date,
      impact_factor,
      publication_link,
    } = req.body;

    if (!publication_title) {
      await t.rollback();
      return res.status(400).json({
        message: 'Required field missing: Title of the Paper',
      });
    }

    const index_typeVal = index_type || 'Scopus';
    const authorArray = parseAuthors(authors);
    if (authorArray.length === 0) {
      await t.rollback();
      return res.status(400).json({ message: 'Authors list cannot be empty' });
    }

    const userId = req.user?.userId || req.user?.Userid || req.body.Userid;
    if (!userId) {
      await t.rollback();
      return res.status(401).json({ message: 'User ID not found' });
    }

    const record = await BookChapter.findByPk(id, { transaction: t });
    if (!record) {
      await t.rollback();
      return res.status(404).json({ message: 'Publication record not found' });
    }

    if (record.Userid !== userId) {
      await t.rollback();
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const yearVal = published_year ? parseInt(published_year, 10) : record.published_year;
    const monthVal = published_month || record.published_month || 'January';
    const monthMap = { january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12' };
    const mm = monthMap[String(monthVal).trim().toLowerCase()] || '01';
    const dateVal = publication_date || (yearVal ? `${yearVal}-${mm}-01` : record.publication_date);

    await record.update({
      publication_type: publication_type || record.publication_type,
      publication_name: publication_name ?? record.publication_name,
      publication_title,
      authors: authorArray.join(', '),
      published_month: monthVal,
      published_year: yearVal,
      index_type: index_typeVal,
      doi: doi ?? record.doi,
      citations: citations !== undefined ? parseInt(citations, 10) || 0 : record.citations,
      publisher: publisher ?? record.publisher,
      volume_no: volume_no ?? record.volume_no,
      page_no: page_no ?? record.page_no,
      issue_no: issue_no ?? record.issue_no,
      publication_date: dateVal,
      impact_factor: impact_factor ?? record.impact_factor,
      publication_link: publication_link ?? record.publication_link,
    }, { transaction: t });

    // Refresh child authors
    await BookChapterAuthor.destroy({ where: { book_chapter_id: record.id }, transaction: t });
    if (authorArray.length > 0) {
      await BookChapterAuthor.bulkCreate(
        authorArray.map((name, idx) => ({
          book_chapter_id: record.id,
          author_name: name,
          author_order: idx + 1,
        })),
        { transaction: t }
      );
    }

    await t.commit();
    res.status(200).json({ message: 'Publication updated' });
  } catch (error) {
    await t.rollback();
    console.error('Error updating publication:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// DELETE /book-chapters/:id
export const deleteBookChapter = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.Userid || req.body.Userid;
    if (!userId) {
      return res.status(401).json({ message: 'User ID not found' });
    }

    const record = await BookChapter.findByPk(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Book chapter not found' });
    }

    if (record.Userid !== userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await record.destroy();
    res.status(200).json({ message: 'Book chapter deleted' });
  } catch (error) {
    console.error('Error deleting book chapter:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
