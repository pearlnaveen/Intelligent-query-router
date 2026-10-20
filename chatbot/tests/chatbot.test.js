import { jest } from '@jest/globals';
import dbService from '../src/services/dbService.js';
import contextService from '../src/services/contextService.js';
import { handleChatQuery } from '../src/controllers/nlpRouter.js';
import pool from '../src/config/db.js';

// Setup database pool connection verification before running database tests
describe('NEC Chatbot Test Suite', () => {
  
  // 1) Context Service Test
  describe('Context Service (Session Memory)', () => {
    const sessionId = 'test-session-123';

    beforeEach(() => {
      contextService.clearContext(sessionId);
    });

    test('should return default context if not found', () => {
      const ctx = contextService.getContext(sessionId);
      expect(ctx.lastDepartment).toBeNull();
      expect(ctx.lastBatch).toBe('2023');
      expect(ctx.lastIntent).toBeNull();
    });

    test('should update and retrieve context successfully', () => {
      contextService.updateContext(sessionId, {
        lastDepartment: 'CSE',
        lastCompany: 'Zoho Corporation',
        lastIntent: 'placement_percentage'
      });
      const ctx = contextService.getContext(sessionId);
      expect(ctx.lastDepartment).toBe('CSE');
      expect(ctx.lastCompany).toBe('Zoho Corporation');
      expect(ctx.lastIntent).toBe('placement_percentage');
    });
  });

  // 2) Database Service Test (Queries seeded test database)
  describe('Database Service Integration', () => {
    test('should retrieve overall placement statistics for 2023', async () => {
      const stats = await dbService.getOverallPlacementStatistics('2023');
      expect(stats.placedCount).toBeGreaterThan(0);
      expect(stats.registeredCount).toBeGreaterThan(0);
      expect(parseFloat(stats.percentParticipating)).toBeGreaterThan(0);
    });

    test('should retrieve CSE department placement statistics for 2023', async () => {
      const stats = await dbService.getDepartmentPlacementStatistics('CSE', '2023');
      expect(stats.department).toBe('CSE');
      expect(stats.placedCount).toBeGreaterThan(0);
    });

    test('should retrieve highest package', async () => {
      const highest = await dbService.getHighestPackage({ batch: '2023' });
      expect(highest).not.toBeNull();
      expect(highest.maxPackage).toBeDefined();
      expect(parseFloat(highest.maxPackage)).toBeCloseTo(8.5, 1);
    });

    test('should retrieve average package', async () => {
      const avg = await dbService.getAveragePackage({ batch: '2023' });
      expect(avg).not.toBeNull();
      expect(avg.avgPackage).toBeDefined();
      expect(avg.avgPackage).toBeLessThan(8.5);
    });

    test('should retrieve recruiting companies', async () => {
      const companies = await dbService.getRecruitingCompanies({ batch: '2023' });
      expect(companies).toContain('Zoho Corporation');
      expect(companies).toContain('TCS');
    });

    test('should retrieve upcoming placement drives', async () => {
      const drives = await dbService.getUpcomingDrives({ batch: '2024' });
      expect(drives.length).toBeGreaterThan(0);
      expect(drives.some(d => d.company === 'Zoho Corporation')).toBe(true);
    });

    test('should retrieve company feedback without leaking student details', async () => {
      const feedback = await dbService.getCompanyInterviewFeedback('Zoho');
      expect(feedback).not.toBeNull();
      expect(feedback.company).toBe('Zoho Corporation');
      expect(feedback.experiences.length).toBeGreaterThan(0);
      
      const exp = feedback.experiences[0];
      // Leaking checks
      expect(exp.student_name).toBeUndefined();
      expect(exp.registerNumber).toBeUndefined();
      expect(exp.student_id).toBeUndefined();
      
      // Content checks
      expect(exp.roundsCount).toBe(4);
      expect(exp.technicalQuestions).toContain('detect and remove cycle');
    });
  });

  // 3) Intent Routing and Safety Block Integration Tests
  describe('Intent Routing & Privacy/SQL Injection Safety', () => {
    const mockRes = () => {
      const res = {};
      res.status = jest.fn().mockReturnValue(res);
      res.json = jest.fn().mockReturnValue(res);
      return res;
    };

    test('should answer general question: Who is the founder?', async () => {
      const req = { body: { message: 'Who is the founder of NEC?', sessionId: 'test' } };
      const res = mockRes();
      
      await handleChatQuery(req, res);
      
      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('founder_info');
      expect(responseData.reply).toContain('Thiru. K. Ramasamy');
      expect(responseData.sourceType).toBe('static');
    });

    test('should answer general question: What documents are needed for admission?', async () => {
      const req = { body: { message: 'What documents are needed for admission?', sessionId: 'test' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('admission_info');
      expect(responseData.reply).toContain('TNEA Provisional allotment order');
      expect(responseData.reply).toContain('10th Marksheet');
      expect(responseData.sourceType).toBe('static');
    });

    test('should answer general question: Where is the college located?', async () => {
      const req = { body: { message: 'Where is the college located?', sessionId: 'test' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('how_to_reach_info');
      expect(responseData.reply).toContain('K.R. Nagar, Kovilpatti');
      expect(responseData.sourceType).toBe('static');
    });

    test('should answer general question: What is the vision of the college?', async () => {
      const req = { body: { message: 'What is the vision of the college?', sessionId: 'test' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('vision_mission_info');
      expect(responseData.reply).toContain('Transforming lives through quality education');
      expect(responseData.sourceType).toBe('static');
    });

    test('should answer general question: How do I contact the college?', async () => {
      const req = { body: { message: 'How do I contact the college?', sessionId: 'test' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('contact_info');
      expect(responseData.reply).toContain('principal@nec.edu.in');
      expect(responseData.sourceType).toBe('static');
    });

    test('should answer general question: Tell me about CSE department', async () => {
      const req = { body: { message: 'Tell me about the CSE department', sessionId: 'test' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('cse_dept_info');
      expect(responseData.reply).toContain('Dr. V. Gomathi');
      expect(responseData.sourceType).toBe('static');
    });

    test('should answer general question: placement', async () => {
      const req = { body: { message: 'placement', sessionId: 'test' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('placement_highlights_static_info');
      expect(responseData.reply).toContain('National Engineering College maintains a consistent placement rate of above 95%');
      expect(responseData.sourceType).toBe('static');
    });

    test('should handle spelling mistakes on placements: "placment"', async () => {
      const req = { body: { message: 'placment', sessionId: 'test' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('placement_highlights_static_info');
      expect(responseData.reply).toContain('National Engineering College maintains a consistent placement rate of above 95%');
      expect(responseData.sourceType).toBe('static');
    });

    test('should handle spelling mistakes on admissions: "What are the documents for admision?"', async () => {
      const req = { body: { message: 'What are the documents for admision?', sessionId: 'test' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('admission_info');
      expect(responseData.reply).toContain('TNEA Provisional allotment order');
      expect(responseData.sourceType).toBe('static');
    });

    test('should handle spelling mistakes on founder: "Who is the funder?"', async () => {
      const req = { body: { message: 'Who is the funder?', sessionId: 'test' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('founder_info');
      expect(responseData.reply).toContain('Thiru. K. Ramasamy');
      expect(responseData.sourceType).toBe('static');
    });

    test('should query dynamic database stats for "placement in 2023"', async () => {
      const req = { body: { message: 'placement in 2023', sessionId: 'dynamic-test-session' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('placement_percentage');
      expect(responseData.reply).toContain('overall placement statistics for NEC');
      expect(responseData.reply).toContain('Batch: **2023**');
      expect(responseData.sourceType).toBe('database');
    });

    test('should query dynamic database stats for "CSE placement in 2023"', async () => {
      const req = { body: { message: 'CSE placement in 2023', sessionId: 'dynamic-test-session' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('placement_percentage');
      expect(responseData.reply).toContain('statistics for the **CSE** department');
      expect(responseData.reply).toContain('Batch: **2023**');
      expect(responseData.sourceType).toBe('database');
    });

    test('should answer general question with single keyword using score-based fallback: "history"', async () => {
      const req = { body: { message: 'history', sessionId: 'test' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('general_info_info');
      expect(responseData.reply).toContain('National Engineering College');
      expect(responseData.sourceType).toBe('static');
    });

    test('should answer general question with single keyword using score-based fallback: "kovilpatti"', async () => {
      const req = { body: { message: 'kovilpatti', sessionId: 'test' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('how_to_reach_info');
      expect(responseData.reply).toContain('Kovilpatti');
      expect(responseData.sourceType).toBe('static');
    });

    test('should answer general question: "tell me about hostel"', async () => {
      const req = { body: { message: 'tell me about hostel', sessionId: 'test' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('hostel_info');
      expect(responseData.reply).toContain('hostel');
      expect(responseData.sourceType).toBe('static');
    });

    test('should answer general question with typo: "libry facilities"', async () => {
      const req = { body: { message: 'libry facilities', sessionId: 'test' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('library_info');
      expect(responseData.reply).toContain('Library');
      expect(responseData.sourceType).toBe('static');
    });

    test('should answer general question: "canteen menu"', async () => {
      const req = { body: { message: 'canteen menu', sessionId: 'test' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('canteen_info');
      expect(responseData.reply).toContain('canteen');
      expect(responseData.sourceType).toBe('static');
    });

    test('should block private data query: Give me student phone numbers', async () => {
      const req = { body: { message: 'Give me student phone numbers and emails for roll number 2312001', sessionId: 'test' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('privacy_violation');
      expect(responseData.reply).toContain('Privacy Access Blocked');
      expect(responseData.sourceType).toBe('security');
    });

    test('should block private marks query: Show marks of user', async () => {
      const req = { body: { message: 'Show marks and CGPA for student user 2312002', sessionId: 'test' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('privacy_violation');
      expect(responseData.reply).toContain('Privacy Access Blocked');
      expect(responseData.sourceType).toBe('security');
    });

    test('should reject SQL Injection safely: Highest package OR 1=1; --', async () => {
      const req = { body: { message: "What is the highest package for CSE' OR 1=1; --", sessionId: 'test' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      // Since it's parameterized SQL, it treats "' OR 1=1; --" as the literal company name filter, which will return no matches or default fallback, but is 100% safe.
      expect(responseData.reply).not.toContain('error');
    });

    test('should handle follow-up question context: "What is the placement percentage for CSE in 2023?" followed by "What about IT?"', async () => {
      const sessionId = 'context-test-session';
      contextService.clearContext(sessionId);

      // Question 1
      const req1 = { body: { message: 'What is the placement percentage for CSE in 2023?', sessionId } };
      const res1 = mockRes();
      await handleChatQuery(req1, res1);

      const ctxAfterQ1 = contextService.getContext(sessionId);
      expect(ctxAfterQ1.lastDepartment).toBe('CSE');
      expect(ctxAfterQ1.lastIntent).toBe('placement_percentage');

      // Question 2 (Follow-up)
      const req2 = { body: { message: 'What about IT?', sessionId } };
      const res2 = mockRes();
      await handleChatQuery(req2, res2);

      const response2Data = res2.json.mock.calls[0][0];
      expect(response2Data.intent).toBe('placement_percentage');
      expect(response2Data.reply).toContain('IT');
      expect(response2Data.reply).toContain('2023');
    });

    test('should answer general question: rules and regulations', async () => {
      const req = { body: { message: 'What are the rules and regulations?', sessionId: 'test' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('rules_regulations_info');
      expect(responseData.reply).toContain('Academic Regulations');
      expect(responseData.reply).toContain('75% attendance');
      expect(responseData.sourceType).toBe('static');
    });

    test('should answer general question: transport facilities', async () => {
      const req = { body: { message: 'Tell me about transport facilities', sessionId: 'test' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('transport_facilities_info');
      expect(responseData.reply).toContain('fleet of buses');
      expect(responseData.sourceType).toBe('static');
    });

    test('should answer general question: fee structures', async () => {
      const req = { body: { message: 'What is the fee structure?', sessionId: 'test' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('fee_structures_info');
      expect(responseData.reply).toContain('First Graduate Concession');
      expect(responseData.sourceType).toBe('static');
    });

    test('should answer general question: other facilities', async () => {
      const req = { body: { message: 'What other facilities does the campus have?', sessionId: 'test' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('other_facilities_info');
      expect(responseData.reply).toContain('Business Incubator');
      expect(responseData.reply).toContain('Smart Classrooms');
      expect(responseData.sourceType).toBe('static');
    });

    test('should answer general question: faculties', async () => {
      const req = { body: { message: 'Tell me about the faculties', sessionId: 'test' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('faculties_info');
      expect(responseData.reply).toContain('170+ faculty members');
      expect(responseData.reply).toContain('Dr. V. Gomathi');
      expect(responseData.sourceType).toBe('static');
    });

    test('should answer general question: alumni network', async () => {
      const req = { body: { message: 'Tell me about the alumni network', sessionId: 'test' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('alumni_network_info');
      expect(responseData.reply).toContain('20,000+ graduates');
      expect(responseData.reply).toContain('alumni.nec.edu.in');
      expect(responseData.sourceType).toBe('static');
    });

    test('should answer general question: incubation center', async () => {
      const req = { body: { message: 'What is the incubation center or business incubator?', sessionId: 'test' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('incubation_center_info');
      expect(responseData.reply).toContain('MSME');
      expect(responseData.reply).toContain('commercialized');
      expect(responseData.sourceType).toBe('static');
    });

    test('should answer query for companies visiting in 2023: companies that visit nec in 2023', async () => {
      const req = { body: { message: 'companies that visit nec in 2023', sessionId: 'fresh-companies-session' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('placement_companies');
      expect(responseData.reply).toContain('Zoho Corporation');
      expect(responseData.sourceType).toBe('database');
    });

    test('should answer general question: departments list', async () => {
      const req = { body: { message: 'how many departments are there in NEC', sessionId: 'test' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('departments_list_info');
      expect(responseData.reply).toContain('Computer Science and Engineering');
      expect(responseData.sourceType).toBe('static');
    });

    test('should answer general question: courses offered', async () => {
      const req = { body: { message: 'what courses are offered at the college', sessionId: 'test' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('courses_offered_info');
      expect(responseData.reply).toContain('B.E. Computer Science and Engineering');
      expect(responseData.sourceType).toBe('static');
    });

    test('should answer general question: syllabus and curriculum', async () => {
      const req = { body: { message: 'what is the syllabus or curriculam for each dept', sessionId: 'test' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('syllabus_curriculum_info');
      expect(responseData.reply).toContain('Academic Regulations');
      expect(responseData.sourceType).toBe('static');
    });

    test('should answer general question: companies inside college', async () => {
      const req = { body: { message: 'what companies are inside the college campus?', sessionId: 'test' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('companies_inside_college_info');
      expect(responseData.reply).toContain('Mistral Solutions');
      expect(responseData.reply).toContain('TryCAE Industrial Engineering');
      expect(responseData.sourceType).toBe('static');
    });

    test('should answer general question: Mistral technobation center', async () => {
      const req = { body: { message: 'tell me about mistral solutions', sessionId: 'test' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('mistral_technobation_info');
      expect(responseData.reply).toContain('embedded product design');
      expect(responseData.sourceType).toBe('static');
    });

    test('should answer general question: TryCAE technobation center', async () => {
      const req = { body: { message: 'what is trycae technobation center?', sessionId: 'test' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('trycae_technobation_info');
      expect(responseData.reply).toContain('Walkthrough Animations');
      expect(responseData.sourceType).toBe('static');
    });

    test('should answer general question: home page', async () => {
      const req = { body: { message: 'tell me about the home page info', sessionId: 'test' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('general_info_info');
      expect(responseData.reply).toContain('National Engineering College');
      expect(responseData.sourceType).toBe('static');
    });

    test('should answer general question: mandatory disclosure', async () => {
      const req = { body: { message: 'where is the mandatory disclosure?', sessionId: 'test' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('mandatory_disclosure_info');
      expect(responseData.reply).toContain('AICTE Approval');
      expect(responseData.sourceType).toBe('static');
    });

    test('should answer general question: academics', async () => {
      const req = { body: { message: 'tell me about academics', sessionId: 'test' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('academics_info');
      expect(responseData.reply).toContain('autonomous UG and PG Regulations');
      expect(responseData.sourceType).toBe('static');
    });

    test('should answer general question: coe', async () => {
      const req = { body: { message: 'what does coe do?', sessionId: 'test' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('coe_info');
      expect(responseData.reply).toContain('revaluation');
      expect(responseData.sourceType).toBe('static');
    });

    test('should answer general question: research', async () => {
      const req = { body: { message: 'what research projects or publications are there?', sessionId: 'test' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('research_info');
      expect(responseData.reply).toContain('DST, BRNS, DRDO');
      expect(responseData.sourceType).toBe('static');
    });

    test('should answer general question: iqac', async () => {
      const req = { body: { message: 'tell me about iqac', sessionId: 'test' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('iqac_info');
      expect(responseData.reply).toContain('NAAC and NBA reviews');
      expect(responseData.sourceType).toBe('static');
    });

    test('should answer general question: sa_ir', async () => {
      const req = { body: { message: 'tell me about sa & ir division', sessionId: 'test' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('sa_ir_info');
      expect(responseData.reply).toContain('extracurricular student clubs');
      expect(responseData.sourceType).toBe('static');
    });

    test('should answer general question: innovation', async () => {
      const req = { body: { message: 'what innovation support is there?', sessionId: 'test' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('innovation_info');
      expect(responseData.reply).toContain('MSME Business Incubator');
      expect(responseData.sourceType).toBe('static');
    });

    test('should answer general question: facilities', async () => {
      const req = { body: { message: 'what facilities does the college have?', sessionId: 'test' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('facilities_info');
      expect(responseData.reply).toContain('RO drinking water');
      expect(responseData.sourceType).toBe('static');
    });

    test('should answer general question: students services', async () => {
      const req = { body: { message: 'what services are there for students?', sessionId: 'test' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('students_info');
      expect(responseData.reply).toContain('Anti-Ragging');
      expect(responseData.sourceType).toBe('static');
    });

    test('should answer general question: nirf', async () => {
      const req = { body: { message: 'what is the nirf ranking?', sessionId: 'test' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('nirf_info');
      expect(responseData.reply).toContain('#169');
      expect(responseData.sourceType).toBe('static');
    });

    test('should answer bot identity question: what you do?', async () => {
      const req = { body: { message: 'what you do?', sessionId: 'test' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('bot_identity_info');
      expect(responseData.reply).toContain('NEC Assistant');
      expect(responseData.reply).toContain('Here is what I can do for you:');
      expect(responseData.sourceType).toBe('static');
    });

    test('should answer bot identity question: who are you?', async () => {
      const req = { body: { message: 'who are you?', sessionId: 'test' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('bot_identity_info');
      expect(responseData.reply).toContain('NEC Assistant');
      expect(responseData.reply).toContain('virtual AI helper');
      expect(responseData.sourceType).toBe('static');
    });

    test('should answer general question: tell me about civil department', async () => {
      const req = { body: { message: 'tell me about civil department', sessionId: 'test' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('civil_dept_info');
      expect(responseData.reply).toContain('Dr. I. Padmanaban');
      expect(responseData.reply).toContain('191');
      expect(responseData.sourceType).toBe('static');
    });

    test('should answer general question: tell me about mechanical department', async () => {
      const req = { body: { message: 'tell me about mechanical department', sessionId: 'test' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('mech_dept_info');
      expect(responseData.reply).toContain('Dr Iyah Raja.S.');
      expect(responseData.reply).toContain('1984');
      expect(responseData.sourceType).toBe('static');
    });

    test('should answer query about NSS', async () => {
      const req = { body: { message: 'tell me about nss', sessionId: 'test' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('nss_info');
      expect(responseData.reply).toContain('National Service Scheme');
      expect(responseData.reply).toContain('Blood donation');
      expect(responseData.sourceType).toBe('static');
    });

    test('should answer query about NCC', async () => {
      const req = { body: { message: 'what is ncc?', sessionId: 'test' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('ncc_info');
      expect(responseData.reply).toContain('National Cadet Corps');
      expect(responseData.reply).toContain('B');
      expect(responseData.sourceType).toBe('static');
    });

    test('should answer query about student clubs', async () => {
      const req = { body: { message: 'what clubs are available in nec?', sessionId: 'test' } };
      const res = mockRes();

      await handleChatQuery(req, res);

      expect(res.json).toHaveBeenCalled();
      const responseData = res.json.mock.calls[0][0];
      expect(responseData.intent).toBe('student_clubs_info');
      expect(responseData.reply).toContain('Fine Arts');
      expect(responseData.reply).toContain('Rotaract');
      expect(responseData.sourceType).toBe('static');
    });
  });

  afterAll(async () => {
    await pool.end();
  });
});
