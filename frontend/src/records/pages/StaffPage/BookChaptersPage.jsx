import React, { useState, useEffect } from 'react';
import { Plus, Upload } from 'lucide-react';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import TagInput from '../../components/TagInput';
import YearPicker from '../../components/YearPicker';
import ExcelBulkUploadModal from '../../components/ExcelBulkUploadModal';
import { getBookChapters, createBookChapter, updateBookChapter, deleteBookChapter, bulkCreateBookChapters } from '../../services/api';
import toast from 'react-hot-toast';

const BookChaptersPage = () => {
  const [bookChapters, setBookChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [currentBookChapter, setCurrentBookChapter] = useState(null);

  const [formData, setFormData] = useState({
    publication_type: 'journal',
    authors: '',
    publication_title: '',
    published_month: 'January',
    published_year: new Date().getFullYear().toString(),
    doi: '',
    impact_factor: '',
    index_type: 'Scopus',
    volume_no: '',
    page_no: '',
    issue_no: '',
    citations: '',
    publisher: '',
    publication_link: ''
  });

  const fetchBookChapters = async () => {
    try {
      setLoading(true);
      const response = await getBookChapters();
      let arr = [];
      if (response) {
        if (Array.isArray(response)) arr = response;
        else if (response.data) {
          if (Array.isArray(response.data)) arr = response.data;
          else if (response.data.data && Array.isArray(response.data.data)) arr = response.data.data;
        }
      }
      setBookChapters(arr);
    } catch (error) {
      console.error('Error fetching publication records:', error);
      toast.error('Failed to load publication records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookChapters();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const resetForm = () => {
    setFormData({
      publication_type: 'journal',
      authors: '',
      publication_title: '',
      published_month: 'January',
      published_year: new Date().getFullYear().toString(),
      doi: '',
      impact_factor: '',
      index_type: 'Scopus',
      volume_no: '',
      page_no: '',
      issue_no: '',
      citations: '',
      publisher: '',
      publication_link: ''
    });
    setCurrentBookChapter(null);
    setIsViewMode(false);
  };

  const handleAddNew = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleEdit = (bookChapter) => {
    setCurrentBookChapter(bookChapter);
    
    // Format authors for tag input
    let authorsStr = '';
    if (Array.isArray(bookChapter.authorsList) && bookChapter.authorsList.length > 0) {
      authorsStr = bookChapter.authorsList.join(', ');
    } else if (Array.isArray(bookChapter.authors)) {
      authorsStr = bookChapter.authors.join(', ');
    } else {
      authorsStr = bookChapter.authors || '';
    }

    setFormData({
      publication_type: bookChapter.publication_type || 'journal',
      authors: authorsStr,
      publication_title: bookChapter.publication_title || '',
      published_month: bookChapter.published_month || (bookChapter.publication_date ? new Date(bookChapter.publication_date).toLocaleString('default', { month: 'Long' }) : 'January'),
      published_year: bookChapter.published_year?.toString() || (bookChapter.publication_date ? new Date(bookChapter.publication_date).getFullYear().toString() : new Date().getFullYear().toString()),
      doi: bookChapter.doi || '',
      impact_factor: bookChapter.impact_factor?.toString() || '',
      index_type: bookChapter.index_type || 'Scopus',
      volume_no: bookChapter.volume_no || '',
      page_no: bookChapter.page_no || '',
      issue_no: bookChapter.issue_no || '',
      citations: bookChapter.citations?.toString() || '',
      publisher: bookChapter.publisher || '',
      publication_link: bookChapter.publication_link || ''
    });
    setIsViewMode(false);
    setIsModalOpen(true);
  };

  const handleView = (bookChapter) => {
    setCurrentBookChapter(bookChapter);
    let authorsStr = '';
    if (Array.isArray(bookChapter.authorsList) && bookChapter.authorsList.length > 0) {
      authorsStr = bookChapter.authorsList.join(', ');
    } else if (Array.isArray(bookChapter.authors)) {
      authorsStr = bookChapter.authors.join(', ');
    } else {
      authorsStr = bookChapter.authors || '';
    }

    setFormData({
      publication_type: bookChapter.publication_type || 'journal',
      authors: authorsStr,
      publication_title: bookChapter.publication_title || '',
      published_month: bookChapter.published_month || (bookChapter.publication_date ? new Date(bookChapter.publication_date).toLocaleString('default', { month: 'Long' }) : 'January'),
      published_year: bookChapter.published_year?.toString() || (bookChapter.publication_date ? new Date(bookChapter.publication_date).getFullYear().toString() : new Date().getFullYear().toString()),
      doi: bookChapter.doi || '',
      impact_factor: bookChapter.impact_factor?.toString() || '',
      index_type: bookChapter.index_type || 'Scopus',
      volume_no: bookChapter.volume_no || '',
      page_no: bookChapter.page_no || '',
      issue_no: bookChapter.issue_no || '',
      citations: bookChapter.citations?.toString() || '',
      publisher: bookChapter.publisher || '',
      publication_link: bookChapter.publication_link || ''
    });
    setIsViewMode(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (bookChapter) => {
    if (window.confirm(`Are you sure you want to delete this publication: ${bookChapter.publication_title}?`)) {
      try {
        await deleteBookChapter(bookChapter.id);
        toast.success('Publication deleted successfully');
        fetchBookChapters();
      } catch (error) {
        console.error('Error deleting publication:', error);
        toast.error('Failed to delete publication');
      }
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      if (
        !formData.publication_type?.trim() ||
        !formData.authors?.trim() ||
        !formData.publication_title?.trim() ||
        !formData.published_month ||
        !formData.published_year
      ) {
        toast.error('Please fill in required fields: Publication Type, List of Authors, Title of Paper, Published Month, Published Year');
        return;
      }

      const normalizeAuthors = (str) => {
        if (!str) return '';
        return str
          .split(',')
          .map(a => a.trim())
          .filter(Boolean)
          .join(', ');
      };

      const payload = {
        ...formData,
        authors: normalizeAuthors(formData.authors)
      };

      if (currentBookChapter) {
        await updateBookChapter(currentBookChapter.id, payload);
        toast.success('Publication updated successfully');
      } else {
        await createBookChapter(payload);
        toast.success('Publication created successfully');
      }

      setIsModalOpen(false);
      resetForm();
      fetchBookChapters();
    } catch (error) {
      console.error('Error saving publication:', error);
      const errorMessage = error.response?.data?.message || 'Failed to save publication';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Custom renderer for publication link column
  const renderPublicationLink = (value) => {
    if (!value) return '-';
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="text-indigo-600 hover:text-blue-800 underline font-medium"
      >
        View Link
      </a>
    );
  };

  const columns = [
    { 
      field: 'publication_type', 
      header: 'Publication Type',
      render: (item) => {
        const type = (item.publication_type || '').toLowerCase();
        if (type === 'journal') return 'Journal';
        if (type === 'bookchapter' || type === 'book_chapter') return 'Book Chapter';
        if (type === 'conference paper' || type === 'conference') return 'Conference Paper';
        return item.publication_type || '-';
      }
    },
    {
      field: 'authors',
      header: 'List of Authors',
      render: (item) => {
        let authorList = [];
        if (Array.isArray(item.authorsList) && item.authorsList.length > 0) authorList = item.authorsList;
        else if (Array.isArray(item.authors) && item.authors.length > 0) authorList = item.authors;
        else if (item.authors) authorList = String(item.authors).split(',').map(a => a.trim()).filter(Boolean);

        if (authorList.length === 0) return '-';
        return (
          <div className="space-y-1">
            {authorList.map((author, index) => (
              <div key={index} className="text-sm text-gray-800">• {author}</div>
            ))}
          </div>
        );
      }
    },
    { field: 'publication_title', header: 'Title of the Paper' },
    { field: 'published_month', header: 'Published Month' },
    { field: 'published_year', header: 'Published Year' },
    { field: 'doi', header: 'DOI' },
    { field: 'impact_factor', header: 'Impact Factor' },
    { field: 'index_type', header: 'SCI / Scopus Indexed / WoS' },
    { field: 'volume_no', header: 'Volume No.' },
    { field: 'page_no', header: 'Page No.' },
    { field: 'issue_no', header: 'Issue No.' },
    { field: 'citations', header: 'No. of Citations' },
    { field: 'publisher', header: 'Publisher' },
    {
      field: 'publication_link',
      header: 'Link',
      render: (item) => renderPublicationLink(item.publication_link)
    }
  ];

  const publicationTypes = [
    { value: 'journal', label: 'Journal' },
    { value: 'bookchapter', label: 'Book Chapter' }
  ];

  const monthOptions = [
    { value: 'January', label: 'January' },
    { value: 'February', label: 'February' },
    { value: 'March', label: 'March' },
    { value: 'April', label: 'April' },
    { value: 'May', label: 'May' },
    { value: 'June', label: 'June' },
    { value: 'July', label: 'July' },
    { value: 'August', label: 'August' },
    { value: 'September', label: 'September' },
    { value: 'October', label: 'October' },
    { value: 'November', label: 'November' },
    { value: 'December', label: 'December' }
  ];

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 60 }, (_, i) => {
    const y = (currentYear + 1 - i).toString();
    return { value: y, label: y };
  });

  const indexTypes = [
    { value: 'Scopus', label: 'Scopus' },
    { value: 'SCI', label: 'SCI' },
    { value: 'SCIE', label: 'SCIE' },
    { value: 'WoS', label: 'WoS' },
    { value: 'SSCI', label: 'SSCI' },
    { value: 'A&HCI', label: 'A&HCI' },
    { value: 'ESCI', label: 'ESCI' },
    { value: 'UGC CARE', label: 'UGC CARE' },
    { value: 'Other', label: 'Other' }
  ];

  const excelColumns = [
    { 
      key: 'publication_type', 
      label: 'Publication Type', 
      aliases: ['type', 'publicationtype', 'typeofpublication'],
      required: true, 
      options: ['Journal', 'Book Chapter', 'journal', 'bookchapter', 'book_chapter'], 
      example: 'Journal',
      isDynamicMaster: true
    },
    { 
      key: 'authors', 
      label: 'List of Authors (as per the paper)', 
      aliases: ['authors', 'listofauthors', 'author', 'authorname', 'authorsname'],
      required: true, 
      example: 'Dr. John Doe, Prof. Jane Smith' 
    },
    { 
      key: 'publication_title', 
      label: 'Title of the Paper', 
      aliases: ['title', 'publicationtitle', 'titleofthepaper', 'papertitle'],
      required: true, 
      example: 'Advances in Deep Learning Architectures' 
    },
    { 
      key: 'published_month', 
      label: 'Published Month', 
      aliases: ['month', 'publishedmonth', 'publicationmonth'],
      required: true, 
      options: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], 
      example: 'January',
      isDynamicMaster: true
    },
    { 
      key: 'published_year', 
      label: 'Published Year', 
      aliases: ['year', 'publishedyear', 'publicationyear'],
      required: true, 
      type: 'number', 
      example: 2026 
    },
    { key: 'doi', label: 'DOI', aliases: ['doi'], required: false, example: '10.1007/s10110-026-00123-x' },
    { key: 'impact_factor', label: 'Impact Factor', aliases: ['impactfactor', 'impact'], required: false, type: 'number', example: 4.52 },
    { 
      key: 'index_type', 
      label: 'SCI / Scopus Indexed / WoS', 
      aliases: ['indextype', 'indexing', 'sciscopusindexedwos', 'scopus', 'sci'],
      required: true, 
      options: ['Scopus', 'SCI', 'SCIE', 'WoS', 'SSCI', 'A&HCI', 'ESCI', 'UGC CARE', 'Other'], 
      example: 'Scopus',
      isDynamicMaster: true
    },
    { key: 'volume_no', label: 'Volume No.', aliases: ['volume', 'volumeno', 'vol'], required: false, example: '12' },
    { key: 'page_no', label: 'Page No.', aliases: ['pages', 'pageno', 'page'], required: false, example: '101-115' },
    { key: 'issue_no', label: 'Issue No.', aliases: ['issue', 'issueno'], required: false, example: '4' },
    { key: 'citations', label: 'No. of Citations', aliases: ['citations', 'noofcitations', 'citationcount'], required: false, type: 'number', example: 15 },
    { key: 'publisher', label: 'Publisher', aliases: ['publisher'], required: false, example: 'Springer Nature' }
  ];

  return (
    <div>
      <div className="mb-6 flex justify-between items-center flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-gray-800">Publications</h2>
        <div className="flex gap-3">
          <button
            type="button"
            className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-md font-semibold text-sm shadow-xs"
            onClick={() => setIsExcelModalOpen(true)}
          >
            <Upload size={16} />
            Excel Bulk Upload
          </button>
          <button
            onClick={handleAddNew}
            className="btn flex items-center gap-2 text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 px-4 py-2 rounded-md shadow-md text-sm font-semibold"
          >
            <Plus size={16} />
            Add New Publication
          </button>
        </div>
      </div>

      <DataTable
        data={bookChapters}
        columns={columns}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={loading}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isViewMode ? 'View Publication' : currentBookChapter ? 'Edit Publication' : 'Add New Publication'}
        onSubmit={!isViewMode ? handleSubmit : null}
        isSubmitting={isSubmitting}
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Publication Type */}
          <FormField
            label="Publication Type"
            name="publication_type"
            type="select"
            value={formData.publication_type}
            onChange={handleInputChange}
            required
            disabled={isViewMode}
            options={publicationTypes}
          />

          {/* 2. List of Authors (as per the paper) */}
          <div className="md:col-span-2">
            <TagInput
              label="List of Authors (as per the paper)"
              values={formData.authors}
              onChange={(updatedTags) => setFormData((prev) => ({ ...prev, authors: updatedTags.join(', ') }))}
              disabled={isViewMode}
              required
              placeholder="Type author name and press enter or click Add..."
              buttonText="Add Author"
            />
          </div>

          {/* 3. Title of the Paper */}
          <div className="md:col-span-2">
            <FormField
              label="Title of the Paper"
              name="publication_title"
              type="textarea"
              rows={2}
              value={formData.publication_title}
              onChange={handleInputChange}
              required
              disabled={isViewMode}
              placeholder="e.g., Deep Neural Networks for Educational Data Mining"
            />
          </div>

          {/* 4. Published Month */}
          <FormField
            label="Published Month"
            name="published_month"
            type="select"
            value={formData.published_month}
            onChange={handleInputChange}
            required
            disabled={isViewMode}
            options={monthOptions}
          />

          {/* 5. Published Year */}
          <YearPicker
            label="Published Year"
            name="published_year"
            value={formData.published_year}
            onChange={handleInputChange}
            required
            disabled={isViewMode}
            placeholder="Select Published Year"
          />

          {/* 6. DOI */}
          <FormField
            label="DOI"
            name="doi"
            value={formData.doi}
            onChange={handleInputChange}
            disabled={isViewMode}
            placeholder="e.g., 10.1007/s10110-026-00123-x"
          />

          {/* 7. Impact Factor */}
          <FormField
            label="Impact Factor"
            name="impact_factor"
            type="number"
            step="0.001"
            value={formData.impact_factor}
            onChange={handleInputChange}
            disabled={isViewMode}
            placeholder="e.g., 4.52"
          />

          {/* 8. SCI / Scopus Indexed / WoS */}
          <FormField
            label="SCI / Scopus Indexed / WoS"
            name="index_type"
            type="select"
            value={formData.index_type}
            onChange={handleInputChange}
            required
            disabled={isViewMode}
            options={indexTypes}
          />

          {/* 9. Volume No. */}
          <FormField
            label="Volume No."
            name="volume_no"
            value={formData.volume_no}
            onChange={handleInputChange}
            disabled={isViewMode}
            placeholder="e.g., 12"
          />

          {/* 10. Page No. */}
          <FormField
            label="Page No."
            name="page_no"
            value={formData.page_no}
            onChange={handleInputChange}
            disabled={isViewMode}
            placeholder="e.g., 101-115"
          />

          {/* 11. Issue No. */}
          <FormField
            label="Issue No."
            name="issue_no"
            value={formData.issue_no}
            onChange={handleInputChange}
            disabled={isViewMode}
            placeholder="e.g., 4"
          />

          {/* 12. No. of Citations */}
          <FormField
            label="No. of Citations"
            name="citations"
            type="number"
            value={formData.citations}
            onChange={handleInputChange}
            disabled={isViewMode}
            placeholder="e.g., 15"
          />

          {/* 13. Publisher */}
          <FormField
            label="Publisher"
            name="publisher"
            value={formData.publisher}
            onChange={handleInputChange}
            disabled={isViewMode}
            placeholder="e.g., Springer Nature, IEEE, Elsevier"
          />

          {/* Optional Publication Link */}
          <div className="md:col-span-2">
            <FormField
              label="Publication Link (URL)"
              name="publication_link"
              type="url"
              value={formData.publication_link}
              onChange={handleInputChange}
              disabled={isViewMode}
              placeholder="e.g., https://link.springer.com/article/10.1007/s10110-026-00123-x"
            />
          </div>
        </div>
      </Modal>

      {/* Excel Bulk Upload Modal */}
      <ExcelBulkUploadModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        title="Bulk Upload Publications"
        columns={excelColumns}
        onUpload={async (validRows) => {
          await bulkCreateBookChapters(validRows);
          fetchBookChapters();
        }}
        templateFilename="Publications_Template.xlsx"
      />
    </div>
  );
};

export default BookChaptersPage;