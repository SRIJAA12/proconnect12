// Faculty Dashboard - View and Filter Student Data
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentAPI, isAuthenticated } from '../services/api';
import { Student } from '../types';
import './FacultyDashboard.css';

function FacultyDashboard() {
  const navigate = useNavigate();
  
  // State for student data
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  
  // State for search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterHasRelatives, setFilterHasRelatives] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterDesignation, setFilterDesignation] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  
  // Autocomplete states
  const [branchInput, setBranchInput] = useState('');
  const [sectionInput, setSectionInput] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [designationInput, setDesignationInput] = useState('');
  const [companyInput, setCompanyInput] = useState('');
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [showSectionDropdown, setShowSectionDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showDesignationDropdown, setShowDesignationDropdown] = useState(false);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Column header filter dropdown states
  const [showColumnFilterBranch, setShowColumnFilterBranch] = useState(false);
  const [showColumnFilterSection, setShowColumnFilterSection] = useState(false);
  const [showColumnFilterContacts, setShowColumnFilterContacts] = useState(false);

  // State for modal
  const [showModal, setShowModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Get unique values for filter dropdowns
  const [branches] = useState<string[]>([
    'CSE', 'ECE', 'EEE', 'ICE', 'MECH', 'CIVIL', 'AIDS', 'CSBS' , 'VLSI'
  ]);

  const getTotalProfessionalContacts = (student: Student) => {
    return (student.relativesInIT?.length || 0) +
      (student.siblings?.length || 0) +
      (student.parents?.father?.occupationType === 'employed' && student.parents?.father?.status === 'alive' ? 1 : 0) +
      (student.parents?.mother?.occupationType === 'employed' && student.parents?.mother?.status === 'alive' ? 1 : 0);
  };

  // Check authentication on component mount
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/faculty/login');
    } else {
      fetchStudents();
    }
  }, [navigate]);

  // Fetch all students from API
  const fetchStudents = async () => {
    try {
      setLoading(true);
      setLoadError('');
      
      // Call backend API to get all students
      const response = await studentAPI.getAll();

      const normalizeStudent = (raw: any): Student => {
        const basicInfo = raw?.basic_info || {};
        const parentDetails = raw?.parent_details || {};
        const siblingsList = Array.isArray(raw?.siblings)
          ? raw.siblings
          : (raw?.siblings?.siblings_list || []);
        const relativesList = Array.isArray(raw?.relatives)
          ? raw.relatives
          : (raw?.relatives_in_it?.relatives_list || []);

        return {
          id: raw?._id || raw?.id || '',
          studentName: basicInfo.student_name || raw?.studentName || '',
          mobileNo: basicInfo.mobile_no || raw?.mobileNo || '',
          parentMobile: basicInfo.parent_mobile || raw?.parentMobile || '',
          personalMail: basicInfo.personal_mail || raw?.personalMail || '',
          collegeMail: basicInfo.college_mail || raw?.collegeMail || '',
          branch: basicInfo.branch || raw?.branch || '',
          section: basicInfo.section || raw?.section || '',
          year: basicInfo.year || raw?.year || '',
          rollNumber: basicInfo.roll_number || raw?.rollNumber || '',
          parents: {
            mother: parentDetails.mother || {
              status: 'nil',
              name: '',
              contactNumber: '',
              education: '',
              occupationType: '',
            },
            father: parentDetails.father || {
              status: 'nil',
              name: '',
              contactNumber: '',
              education: '',
              occupationType: '',
            },
            guardian: parentDetails.guardian || undefined,
          },
          hasSiblingsInIT: siblingsList.length > 0,
          siblings: siblingsList,
          hasRelativesInIT: relativesList.length > 0,
          relativesInIT: relativesList,
          createdAt: raw?.created_at ? new Date(raw.created_at) : new Date(),
          updatedAt: raw?.updated_at ? new Date(raw.updated_at) : new Date(),
        };
      };
      
      // Map response data to Student objects
      // Backend returns: { students: [...], page, pages, total, limit }
      const studentsData: Student[] = (response.students || []).map((student: any) => normalizeStudent(student));
      
      setStudents(studentsData);
      setFilteredStudents(studentsData);
      
    } catch (error) {
      console.error('Error fetching students:', error);
      setLoadError('Unable to load student records. Make sure the backend is restarted after the CORS change, then refresh the page and log in again.');
    } finally {
      setLoading(false);
    }
  };

  // Apply filters whenever filter state changes
  useEffect(() => {
    applyFilters();
  }, [searchQuery, filterBranch, filterSection, filterHasRelatives, filterCity, filterDesignation, filterCompany, students]);
  
  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterBranch, filterSection, filterHasRelatives, filterCity, filterDesignation, filterCompany]);

  // Autocomplete filter functions
  const filteredBranches = useMemo(() => {
    if (!branchInput && !filterBranch) return branches;
    const searchValue = branchInput || filterBranch || '';
    return branches.filter(branch => 
      branch.toLowerCase().includes(searchValue.toLowerCase())
    );
  }, [branchInput, filterBranch, branches]);
  
  // Get unique sections from actual student data
  const availableSections = useMemo(() => {
    const sections = new Set<string>();
    // Add default sections
    ['A', 'B', 'C', 'D'].forEach(section => sections.add(section));
    // Add sections from student data
    students.forEach(student => {
      if (student.section) {
        sections.add(student.section);
      }
    });
    return Array.from(sections).sort();
  }, [students]);
  
  const filteredSections = useMemo(() => {
    if (!sectionInput && !filterSection) return availableSections;
    const searchValue = sectionInput || filterSection || '';
    return availableSections.filter(section => 
      section.toLowerCase().includes(searchValue.toLowerCase())
    );
  }, [sectionInput, filterSection, availableSections]);
  
  // Get unique cities from actual student data with typo correction (both relatives and siblings)
  const availableCities = useMemo(() => {
    const citySet = new Set<string>();
    const cityMap: { [key: string]: string } = {
      'banglore': 'Bangalore',
      'bangalor': 'Bangalore',
      'bombay': 'Mumbai',
      'calcutta': 'Kolkata',
      'delhi': 'Delhi',
      'new delhi': 'Delhi',
      'hyderabad': 'Hyderabad',
      'chenai': 'Chennai',
      'madras': 'Chennai',
      'pune': 'Pune',
      'coimbatore': 'Coimbatore'
    };
    
    students.forEach(student => {
      // From Professional Contacts (relativesInIT)
      if (student.relativesInIT && student.relativesInIT.length > 0) {
        student.relativesInIT.forEach(relative => {
          if (relative.workCity) {
            const normalizedCity = relative.workCity.toLowerCase().trim();
            const correctedCity = cityMap[normalizedCity] || relative.workCity;
            citySet.add(correctedCity);
          }
        });
      }
      
      // From Siblings in Engineering/Professional Field
      if (student.hasSiblingsInIT && student.siblings && student.siblings.length > 0) {
        student.siblings.forEach(sibling => {
          if (sibling.city) {
            const normalizedCity = sibling.city.toLowerCase().trim();
            const correctedCity = cityMap[normalizedCity] || sibling.city;
            citySet.add(correctedCity);
          }
        });
      }
    });
    return Array.from(citySet).sort();
  }, [students]);
  
  const filteredCities = useMemo(() => {
    if (!cityInput) return availableCities;
    const searchValue = cityInput.toLowerCase();
    const matches = availableCities.filter(city => 
      city.toLowerCase().includes(searchValue)
    );
    
    // If no exact match found, add the custom input as an option
    if (matches.length === 0 && cityInput.trim()) {
      return [cityInput.trim()];
    }
    
    // If input doesn't exactly match any option, add it as first option
    const exactMatch = availableCities.find(c => c.toLowerCase() === searchValue);
    if (!exactMatch && cityInput.trim()) {
      return [cityInput.trim(), ...matches.slice(0, 9)];
    }
    
    return matches.slice(0, 10);
  }, [cityInput, availableCities]);
  
  // Get unique designations from actual student data with normalization (both relatives and siblings)
  const availableDesignations = useMemo(() => {
    const designationSet = new Set<string>();
    
    students.forEach(student => {
      // From Professional Contacts (relativesInIT)
      if (student.relativesInIT && student.relativesInIT.length > 0) {
        student.relativesInIT.forEach(relative => {
          if (relative.designation) {
            // Normalize designation: trim, fix spacing, capitalize properly
            const normalized = relative.designation
              .trim()
              .replace(/\s+/g, ' ')
              .replace(/\b\w/g, l => l.toUpperCase());
            designationSet.add(normalized);
          }
        });
      }
      
      // From Siblings in Engineering/Professional Field
      if (student.hasSiblingsInIT && student.siblings && student.siblings.length > 0) {
        student.siblings.forEach(sibling => {
          if (sibling.designation) {
            // Normalize designation: trim, fix spacing, capitalize properly
            const normalized = sibling.designation
              .trim()
              .replace(/\s+/g, ' ')
              .replace(/\b\w/g, l => l.toUpperCase());
            designationSet.add(normalized);
          }
        });
      }
    });
    return Array.from(designationSet).sort();
  }, [students]);
  
  const filteredDesignations = useMemo(() => {
    if (!designationInput) return availableDesignations;
    const searchValue = designationInput.toLowerCase();
    const matches = availableDesignations.filter(designation => 
      designation.toLowerCase().includes(searchValue)
    );
    
    // If no exact match found, add the custom input as an option
    if (matches.length === 0 && designationInput.trim()) {
      return [designationInput.trim()];
    }
    
    // If input doesn't exactly match any option, add it as first option
    const exactMatch = availableDesignations.find(d => d.toLowerCase() === searchValue);
    if (!exactMatch && designationInput.trim()) {
      return [designationInput.trim(), ...matches.slice(0, 9)];
    }
    
    return matches.slice(0, 10);
  }, [designationInput, availableDesignations]);
  
  // Get unique companies from actual student data (both relatives and siblings)
  const availableCompanies = useMemo(() => {
    const companySet = new Set<string>();
    
    students.forEach(student => {
      // From Professional Contacts (relativesInIT)
      if (student.relativesInIT && student.relativesInIT.length > 0) {
        student.relativesInIT.forEach(relative => {
          if (relative.company) {
            const normalized = relative.company.trim();
            companySet.add(normalized);
          }
          if (relative.organizationName) {
            const normalized = relative.organizationName.trim();
            companySet.add(normalized);
          }
          if (relative.businessName) {
            const normalized = relative.businessName.trim();
            companySet.add(normalized);
          }
        });
      }
      
      // From Siblings in Engineering/Professional Field
      if (student.hasSiblingsInIT && student.siblings && student.siblings.length > 0) {
        student.siblings.forEach(sibling => {
          if (sibling.company) {
            const normalized = sibling.company.trim();
            companySet.add(normalized);
          }
          if (sibling.organizationName) {
            const normalized = sibling.organizationName.trim();
            companySet.add(normalized);
          }
          if (sibling.businessName) {
            const normalized = sibling.businessName.trim();
            companySet.add(normalized);
          }
        });
      }
      
      // From Parents
      if (student.parents) {
        if (student.parents.father?.organizationName) {
          companySet.add(student.parents.father.organizationName.trim());
        }
        if (student.parents.father?.businessName) {
          companySet.add(student.parents.father.businessName.trim());
        }
        if (student.parents.mother?.organizationName) {
          companySet.add(student.parents.mother.organizationName.trim());
        }
        if (student.parents.mother?.businessName) {
          companySet.add(student.parents.mother.businessName.trim());
        }
        if (student.parents.guardian?.organizationName) {
          companySet.add(student.parents.guardian.organizationName.trim());
        }
        if (student.parents.guardian?.businessName) {
          companySet.add(student.parents.guardian.businessName.trim());
        }
      }
    });
    return Array.from(companySet).sort();
  }, [students]);
  
  const filteredCompanies = useMemo(() => {
    if (!companyInput) return availableCompanies;
    const searchValue = companyInput.toLowerCase();
    const matches = availableCompanies.filter(company => 
      company.toLowerCase().includes(searchValue)
    );
    
    // If no exact match found, add the custom input as an option
    if (matches.length === 0 && companyInput.trim()) {
      return [companyInput.trim()];
    }
    
    // If input doesn't exactly match any option, add it as first option
    const exactMatch = availableCompanies.find(c => c.toLowerCase() === searchValue);
    if (!exactMatch && companyInput.trim()) {
      return [companyInput.trim(), ...matches.slice(0, 9)];
    }
    
    return matches.slice(0, 10);
  }, [companyInput, availableCompanies]);
  
  // Pagination logic
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredStudents.slice(startIndex, endIndex);
  }, [filteredStudents, currentPage, itemsPerPage]);
  
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);

  // Filter logic
  const applyFilters = () => {
    let filtered = [...students];

    // Filter by search query (searches in name, roll number, email)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(student =>
        student.studentName?.toLowerCase().includes(query) ||
        student.rollNumber?.toLowerCase().includes(query) ||
        student.collegeMail?.toLowerCase().includes(query) ||
        student.branch?.toLowerCase().includes(query)
      );
    }

    // Filter by branch (case-insensitive)
    if (filterBranch) {
      const branchQuery = filterBranch.toLowerCase();
      filtered = filtered.filter(student => 
        student.branch?.toLowerCase().includes(branchQuery)
      );
    }

    // Filter by section (case-insensitive)
    if (filterSection) {
      const sectionQuery = filterSection.toLowerCase();
      filtered = filtered.filter(student => 
        student.section?.toLowerCase().includes(sectionQuery)
      );
    }

    // Filter by has relatives or siblings in Engineering/Professional field
    if (filterHasRelatives) {
      const hasRelatives = filterHasRelatives === 'yes';
      filtered = filtered.filter(student => 
        (student.hasRelativesInIT === hasRelatives) || (student.hasSiblingsInIT === hasRelatives)
      );
    }

    // Professional Contact Filters with AND logic
    // If any professional contact filter is applied, find students with contacts matching ALL applied filters
    const hasProfessionalContactFilters = filterCity || filterDesignation || filterCompany;
    
    if (hasProfessionalContactFilters) {
      filtered = filtered.filter(student => {
        // Collect all professional contacts (relatives and siblings) and parents who are employed
        const allContacts: any[] = [];
        
        // Add relatives/professional contacts
        if (student.relativesInIT && student.relativesInIT.length > 0) {
          allContacts.push(...student.relativesInIT.map(rel => ({
            ...rel,
            workCity: rel.workCity,
            designation: rel.designation,
            company: rel.company || rel.organizationName || rel.businessName
          })));
        }
        
        // Add siblings in engineering/professional field
        if (student.siblings && student.siblings.length > 0) {
          allContacts.push(...student.siblings.map(sibling => ({
            ...sibling,
            workCity: sibling.city,
            designation: sibling.designation,
            company: sibling.company || sibling.organizationName || sibling.businessName
          })));
        }
        
        // Add employed father
        if (student.parents?.father?.occupationType === 'employed' && student.parents?.father?.status === 'alive') {
          allContacts.push({
            designation: student.parents.father.designation,
            company: student.parents.father.organizationName || student.parents.father.businessName,
            workCity: student.parents.father.officeAddress // Use office address as proxy for city
          });
        }
        
        // Add employed mother
        if (student.parents?.mother?.occupationType === 'employed' && student.parents?.mother?.status === 'alive') {
          allContacts.push({
            designation: student.parents.mother.designation,
            company: student.parents.mother.organizationName || student.parents.mother.businessName,
            workCity: student.parents.mother.officeAddress // Use office address as proxy for city
          });
        }
        
        // Check if at least one contact matches ALL applied filters
        return allContacts.some(contact => {
          // Check city filter
          const cityMatch = !filterCity || 
            contact.workCity?.toLowerCase().trim().includes(filterCity.toLowerCase().trim());
          
          // Check designation filter
          const designationMatch = !filterDesignation || 
            contact.designation?.toLowerCase().trim().includes(filterDesignation.toLowerCase().trim());
          
          // Check company filter
          const companyMatch = !filterCompany || 
            contact.company?.toLowerCase().includes(filterCompany.toLowerCase());
          
          // Return true only if ALL applied filters match
          return cityMatch && designationMatch && companyMatch;
        });
      });
    }

    setFilteredStudents(filtered);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setFilterBranch('');
    setFilterSection('');
    setFilterHasRelatives('');
    setFilterCity('');
    setFilterDesignation('');
    setFilterCompany('');
    setBranchInput('');
    setSectionInput('');
    setCityInput('');
    setDesignationInput('');
    setCompanyInput('');
    setCurrentPage(1);
  };

  // Delete student function
  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (window.confirm(`Are you sure you want to delete ${studentName}'s record? This action cannot be undone.`)) {
      try {
        // Call backend API to delete student
        await studentAPI.delete(studentId);
        // Refresh the student list
        fetchStudents();
        // Close modal if it's open
        if (showModal) {
          handleCloseModal();
        }
        alert('Student record deleted successfully');
      } catch (error) {
        console.error('Error deleting student:', error);
        alert('Failed to delete student record. Please try again.');
      }
    }
  };

  // Open modal to view student details
  const handleViewDetails = (student: Student) => {
    setSelectedStudent(student);
    setShowModal(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedStudent(null);
  };
  
  // Autocomplete handlers
  const handleBranchSelect = (branch: string) => {
    setFilterBranch(branch);
    setBranchInput(branch);
    setShowBranchDropdown(false);
  };
  
  const handleSectionSelect = (section: string) => {
    setFilterSection(section);
    setSectionInput(section);
    setShowSectionDropdown(false);
  };
  
  const handleCitySelect = (city: string) => {
    setFilterCity(city);
    setCityInput(city);
    setShowCityDropdown(false);
  };
  
  const handleDesignationSelect = (designation: string) => {
    setFilterDesignation(designation);
    setDesignationInput(designation);
    setShowDesignationDropdown(false);
  };
  
  // Initialize input values when filters change
  useEffect(() => {
    if (filterBranch && !branchInput) {
      setBranchInput(filterBranch);
    }
  }, [filterBranch, branchInput]);
  
  useEffect(() => {
    if (filterSection && !sectionInput) {
      setSectionInput(filterSection);
    }
  }, [filterSection, sectionInput]);
  
  useEffect(() => {
    if (filterCity && !cityInput) {
      setCityInput(filterCity);
    }
  }, [filterCity, cityInput]);
  
  useEffect(() => {
    if (filterDesignation && !designationInput) {
      setDesignationInput(filterDesignation);
    }
  }, [filterDesignation, designationInput]);
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowBranchDropdown(false);
      setShowSectionDropdown(false);
      setShowCityDropdown(false);
      setShowDesignationDropdown(false);
      setShowColumnFilterBranch(false);
      setShowColumnFilterSection(false);
      setShowColumnFilterContacts(false);
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Export to CSV function
  const exportToCSV = () => {
    if (filteredStudents.length === 0) {
      alert('No data to export');
      return;
    }

    // Create CSV content
    const headers = ['Student Name', 'Roll Number', 'Branch', 'Year', 'Mobile', 'Email', 'Has Relatives in IT', 'Relative Name', 'Company', 'Designation', 'City', 'Contact'];
    const rows = filteredStudents.flatMap(student => {
      if (student.relativesInIT && student.relativesInIT.length > 0) {
        return student.relativesInIT.map(rel => [
          student.studentName,
          student.rollNumber,
          student.branch,
          student.year,
          student.mobileNo,
          student.collegeMail,
          'Yes',
          rel.name,
          rel.company,
          rel.designation,
          rel.workCity,
          rel.contactNumber
        ]);
      } else {
        return [[
          student.studentName,
          student.rollNumber,
          student.branch,
          student.year,
          student.mobileNo,
          student.collegeMail,
          'No',
          '-',
          '-',
          '-',
          '-',
          '-'
        ]];
      }
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students_data_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div>
          <h1>Faculty Dashboard</h1>
          <p className="dashboard-subtitle">PSGiTech Student Information Portal</p>
        </div>
      </header>

      <div className="dashboard-content">
        
        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{students.length}</div>
            <div className="stat-label">Total Students</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {students.filter(s => s.hasRelativesInIT || s.hasSiblingsInIT).length}
            </div>
            <div className="stat-label">Students with Professional Contacts</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {students.reduce((acc, student) => acc + getTotalProfessionalContacts(student), 0)}
            </div>
            <div className="stat-label">Total Professional Contacts</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{filteredStudents.length}</div>
            <div className="stat-label">Filtered Results</div>
          </div>
        </div>

        {loadError && (
          <div className="dashboard-error-banner">
            {loadError}
          </div>
        )}

        {/* Additional Filters Section */}
        <div className="additional-filters-section">
          <div className="filter-row">
            <div className="filter-group-compact">
              <label>Designation</label>
              <input
                type="text"
                className="filter-input-compact"
                placeholder="Search designation..."
                value={designationInput}
                onChange={(e) => {
                  const value = e.target.value;
                  setDesignationInput(value);
                  setFilterDesignation(value);
                }}
                onFocus={() => setShowDesignationDropdown(true)}
                onBlur={() => setTimeout(() => setShowDesignationDropdown(false), 200)}
              />
              {showDesignationDropdown && filteredDesignations.length > 0 && (
                <div className="autocomplete-dropdown">
                  {filteredDesignations.map((designation, index) => (
                    <div
                      key={index}
                      className="autocomplete-item"
                      onClick={() => {
                        setDesignationInput(designation);
                        setFilterDesignation(designation);
                        setShowDesignationDropdown(false);
                      }}
                    >
                      {designation}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="filter-group-compact">
              <label>Company</label>
              <input
                type="text"
                className="filter-input-compact"
                placeholder="Search company..."
                value={companyInput}
                onChange={(e) => {
                  const value = e.target.value;
                  setCompanyInput(value);
                  setFilterCompany(value);
                }}
                onFocus={() => setShowCompanyDropdown(true)}
                onBlur={() => setTimeout(() => setShowCompanyDropdown(false), 200)}
              />
              {showCompanyDropdown && filteredCompanies.length > 0 && (
                <div className="autocomplete-dropdown">
                  {filteredCompanies.map((company, index) => (
                    <div
                      key={index}
                      className="autocomplete-item"
                      onClick={() => {
                        setCompanyInput(company);
                        setFilterCompany(company);
                        setShowCompanyDropdown(false);
                      }}
                    >
                      {company}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="filter-group-compact">
              <label>Work City</label>
              <input
                type="text"
                className="filter-input-compact"
                placeholder="Search city..."
                value={cityInput}
                onChange={(e) => {
                  const value = e.target.value;
                  setCityInput(value);
                  setFilterCity(value);
                }}
                onFocus={() => setShowCityDropdown(true)}
                onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
              />
              {showCityDropdown && filteredCities.length > 0 && (
                <div className="autocomplete-dropdown">
                  {filteredCities.map((city, index) => (
                    <div
                      key={index}
                      className="autocomplete-item"
                      onClick={() => {
                        setCityInput(city);
                        setFilterCity(city);
                        setShowCityDropdown(false);
                      }}
                    >
                      {city}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="table-section">
          {loading ? (
            <div className="loading">Loading student data...</div>
          ) : (
            <>
              {/* Results Summary with Clear Filters - Always Visible */}
              <div className="results-summary">
                <span>
                  {filteredStudents.length === 0 
                    ? "No students found matching your filters." 
                    : `Showing ${((currentPage - 1) * itemsPerPage) + 1} to ${Math.min(currentPage * itemsPerPage, filteredStudents.length)} of ${filteredStudents.length} results`
                  }
                </span>
                <div className="filter-actions-table">
                  <button className="btn btn-secondary" onClick={clearFilters}>
                    Clear Filters
                  </button>
                  <button className="btn btn-primary" onClick={exportToCSV}>
                    Export to CSV
                  </button>
                  <select 
                    value={itemsPerPage} 
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    <option value={5}>5 per page</option>
                    <option value={10}>10 per page</option>
                    <option value={25}>25 per page</option>
                    <option value={50}>50 per page</option>
                  </select>
                </div>
              </div>
              
              {/* Table - Only shown if there are results */}
              {filteredStudents.length > 0 && (
                <>
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>
                            <div className="th-header">
                              <span>Student Name</span>
                              <div className="filter-icon" title="Filter by name">⋮</div>
                            </div>
                          </th>
                          <th>
                            <div className="th-header">
                              <span>Roll Number</span>
                              <div className="filter-icon" title="Filter by roll number">⋮</div>
                            </div>
                          </th>
                          <th style={{ position: 'relative' }}>
                            <div className="th-header">
                              <span>Branch</span>
                              <div 
                                className="filter-icon" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowColumnFilterBranch(!showColumnFilterBranch);
                                }}
                                title="Filter by branch"
                                style={{ cursor: 'pointer' }}
                              >
                                ▼
                              </div>
                            </div>
                            {showColumnFilterBranch && (
                              <div className="column-filter-dropdown" onClick={(e) => e.stopPropagation()}>
                                <div 
                                  className="filter-option"
                                  onClick={() => {
                                    setFilterBranch('');
                                    setShowColumnFilterBranch(false);
                                  }}
                                >
                                  All Branches
                                </div>
                                {branches.map(branch => (
                                  <div
                                    key={branch}
                                    className={`filter-option ${filterBranch === branch ? 'active' : ''}`}
                                    onClick={() => {
                                      setFilterBranch(branch);
                                      setShowColumnFilterBranch(false);
                                    }}
                                  >
                                    {branch} {filterBranch === branch && '✓'}
                                  </div>
                                ))}
                              </div>
                            )}
                          </th>
                          <th style={{ position: 'relative' }}>
                            <div className="th-header">
                              <span>Section</span>
                              <div 
                                className="filter-icon" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowColumnFilterSection(!showColumnFilterSection);
                                }}
                                title="Filter by section"
                                style={{ cursor: 'pointer' }}
                              >
                                ▼
                              </div>
                            </div>
                            {showColumnFilterSection && (
                              <div className="column-filter-dropdown" onClick={(e) => e.stopPropagation()}>
                                <div 
                                  className="filter-option"
                                  onClick={() => {
                                    setFilterSection('');
                                    setShowColumnFilterSection(false);
                                  }}
                                >
                                  All Sections
                                </div>
                                {availableSections.map(section => (
                                  <div
                                    key={section}
                                    className={`filter-option ${filterSection === section ? 'active' : ''}`}
                                    onClick={() => {
                                      setFilterSection(section);
                                      setShowColumnFilterSection(false);
                                    }}
                                  >
                                    {section} {filterSection === section && '✓'}
                                  </div>
                                ))}
                              </div>
                            )}
                          </th>
                          <th>
                            <div className="th-header">
                              <span>Year</span>
                              <div className="filter-icon" title="Filter by year">▼</div>
                            </div>
                          </th>
                          <th>Contact</th>
                          <th style={{ position: 'relative' }}>
                            <div className="th-header">
                              <span>Professional Contacts</span>
                              <div 
                                className="filter-icon" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowColumnFilterContacts(!showColumnFilterContacts);
                                }}
                                title="Filter by contacts"
                                style={{ cursor: 'pointer' }}
                              >
                                ▼
                              </div>
                            </div>
                            {showColumnFilterContacts && (
                              <div className="column-filter-dropdown" onClick={(e) => e.stopPropagation()}>
                                <div 
                                  className="filter-option"
                                  onClick={() => {
                                    setFilterHasRelatives('');
                                    setShowColumnFilterContacts(false);
                                  }}
                                >
                                  All Students
                                </div>
                                <div
                                  className={`filter-option ${filterHasRelatives === 'yes' ? 'active' : ''}`}
                                  onClick={() => {
                                    setFilterHasRelatives('yes');
                                    setShowColumnFilterContacts(false);
                                  }}
                                >
                                  Has Contacts {filterHasRelatives === 'yes' && '✓'}
                                </div>
                                <div
                                  className={`filter-option ${filterHasRelatives === 'no' ? 'active' : ''}`}
                                  onClick={() => {
                                    setFilterHasRelatives('no');
                                    setShowColumnFilterContacts(false);
                                  }}
                                >
                                  No Contacts {filterHasRelatives === 'no' && '✓'}
                                </div>
                              </div>
                            )}
                          </th>
                          <th>
                            <div className="th-header">
                              <span>Actions</span>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedStudents.map((student) => (
                          <tr key={student.id}>
                            <td className="td-name">{student.studentName}</td>
                            <td>{student.rollNumber}</td>
                            <td><span className="badge">{student.branch}</span></td>
                            <td className="td-center">{student.section || '-'}</td>
                            <td>{student.year}</td>
                            <td>
                              <div className="contact-info">
                                <div>{student.mobileNo}</div>
                                <div className="email">{student.collegeMail}</div>
                              </div>
                            </td>
                            <td className="td-center">
                              {student.hasRelativesInIT || student.hasSiblingsInIT || (student.parents && ((student.parents.father && student.parents.father.occupationType === 'employed' && student.parents.father.status === 'alive') || (student.parents.mother && student.parents.mother.occupationType === 'employed' && student.parents.mother.status === 'alive'))) ? (
                                <span className="badge badge-success">
                                  {getTotalProfessionalContacts(student)} Contact(s)
                                </span>
                              ) : (
                                <span className="badge badge-gray">None</span>
                              )}
                            </td>
                            <td>
                              <div className="action-buttons">
                                <button
                                  className="btn-view"
                                  onClick={() => handleViewDetails(student)}
                                >
                                  View
                                </button>
                                <button
                                  className="btn-delete"
                                  onClick={() => handleDeleteStudent(student.id, student.studentName)}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="pagination-controls">
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                      >
                        First
                      </button>
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </button>
                      
                      <div className="page-numbers">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              className={`btn ${currentPage === pageNum ? 'btn-primary' : 'btn-secondary'}`}
                              onClick={() => setCurrentPage(pageNum)}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </button>
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                      >
                        Last
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal for viewing student details */}
      {showModal && selectedStudent && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Student Details</h2>
              <button className="modal-close" onClick={handleCloseModal}>×</button>
            </div>
            
            <div className="modal-body">
              {/* Basic Information */}
              <section className="detail-section">
                <h3>Basic Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Name:</span>
                    <span className="detail-value">{selectedStudent.studentName}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Roll Number:</span>
                    <span className="detail-value">{selectedStudent.rollNumber}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Branch:</span>
                    <span className="detail-value">{selectedStudent.branch}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Section:</span>
                    <span className="detail-value">{selectedStudent.section || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Year:</span>
                    <span className="detail-value">{selectedStudent.year}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Mobile:</span>
                    <span className="detail-value">{selectedStudent.mobileNo}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Parent Mobile:</span>
                    <span className="detail-value">{selectedStudent.parentMobile}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Personal Email:</span>
                    <span className="detail-value">{selectedStudent.personalMail}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">College Email:</span>
                    <span className="detail-value">{selectedStudent.collegeMail}</span>
                  </div>
                </div>
              </section>

              {/* Parent Information */}
              <section className="detail-section">
                <h3>Parent / Guardian Information</h3>
                
                {/* Father Details */}
                {selectedStudent.parents && selectedStudent.parents.father && (
                  <div className="card-detail" style={{ marginBottom: '20px' }}>
                    <h4 style={{ marginBottom: '12px', color: '#2c3e50' }}>Father</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <span className="detail-label">Status:</span>
                        <span className="detail-value">{selectedStudent.parents.father.status === 'alive' ? 'Alive' : selectedStudent.parents.father.status === 'nil' ? 'Not Applicable' : 'Deceased'}</span>
                      </div>
                      {selectedStudent.parents.father.status === 'alive' && (
                        <>
                          <div className="detail-item">
                            <span className="detail-label">Name:</span>
                            <span className="detail-value">{selectedStudent.parents.father.name}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Contact Number:</span>
                            <span className="detail-value">{selectedStudent.parents.father.contactNumber}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">WhatsApp Number:</span>
                            <span className="detail-value">{selectedStudent.parents.father.whatsappNumber || 'N/A'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Personal Email:</span>
                            <span className="detail-value">{selectedStudent.parents.father.personalEmail || 'N/A'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Highest Qualification:</span>
                            <span className="detail-value">{selectedStudent.parents.father.education}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Occupation Type:</span>
                            <span className="detail-value">{selectedStudent.parents.father.occupationType}</span>
                          </div>
                          {selectedStudent.parents.father.occupationType === 'homemaker' && (
                            <div className="detail-item">
                              <span className="detail-label">Previous Occupation:</span>
                              <span className="detail-value">{selectedStudent.parents.father.previousOccupation || 'N/A'}</span>
                            </div>
                          )}
                          {selectedStudent.parents.father.occupationType === 'employed' && (
                            <>
                              <div className="detail-item">
                                <span className="detail-label">Employment Type:</span>
                                <span className="detail-value">{selectedStudent.parents.father.employmentType || 'N/A'}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Organization/Company:</span>
                                <span className="detail-value">{selectedStudent.parents.father.organizationName || 'N/A'}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Sector/Industry:</span>
                                <span className="detail-value">{selectedStudent.parents.father.sector || 'N/A'}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Job Title / Designation:</span>
                                <span className="detail-value">{selectedStudent.parents.father.designation || 'N/A'}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Years of Experience:</span>
                                <span className="detail-value">{selectedStudent.parents.father.yearsOfExperience || 0}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Office Address:</span>
                                <span className="detail-value">{selectedStudent.parents.father.officeAddress || 'N/A'}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Office Contact Number:</span>
                                <span className="detail-value">{selectedStudent.parents.father.officeContactNumber || 'N/A'}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Official Email:</span>
                                <span className="detail-value">{selectedStudent.parents.father.officeEmail || 'N/A'}</span>
                              </div>
                            </>
                          )}
                          {selectedStudent.parents.father.occupationType === 'self-employed' && (
                            <>
                              <div className="detail-item">
                                <span className="detail-label">Business Name:</span>
                                <span className="detail-value">{selectedStudent.parents.father.businessName || 'N/A'}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Business Type:</span>
                                <span className="detail-value">{selectedStudent.parents.father.businessType || 'N/A'}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Industry:</span>
                                <span className="detail-value">{selectedStudent.parents.father.businessIndustry || 'N/A'}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Your Role:</span>
                                <span className="detail-value">{selectedStudent.parents.father.businessRole || 'N/A'}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Business Address:</span>
                                <span className="detail-value">{selectedStudent.parents.father.businessAddress || 'N/A'}</span>
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Mother Details */}
                {selectedStudent.parents && selectedStudent.parents.mother && (
                  <div className="card-detail" style={{ marginBottom: '20px' }}>
                    <h4 style={{ marginBottom: '12px', color: '#2c3e50' }}>Mother</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <span className="detail-label">Status:</span>
                        <span className="detail-value">{selectedStudent.parents.mother.status === 'alive' ? 'Alive' : selectedStudent.parents.mother.status === 'nil' ? 'Not Applicable' : 'Deceased'}</span>
                      </div>
                      {selectedStudent.parents.mother.status === 'alive' && (
                        <>
                          <div className="detail-item">
                            <span className="detail-label">Name:</span>
                            <span className="detail-value">{selectedStudent.parents.mother.name}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Contact Number:</span>
                            <span className="detail-value">{selectedStudent.parents.mother.contactNumber}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">WhatsApp Number:</span>
                            <span className="detail-value">{selectedStudent.parents.mother.whatsappNumber || 'N/A'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Personal Email:</span>
                            <span className="detail-value">{selectedStudent.parents.mother.personalEmail || 'N/A'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Highest Qualification:</span>
                            <span className="detail-value">{selectedStudent.parents.mother.education}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Occupation Type:</span>
                            <span className="detail-value">{selectedStudent.parents.mother.occupationType}</span>
                          </div>
                          {selectedStudent.parents.mother.occupationType === 'homemaker' && (
                            <div className="detail-item">
                              <span className="detail-label">Previous Occupation:</span>
                              <span className="detail-value">{selectedStudent.parents.mother.previousOccupation || 'N/A'}</span>
                            </div>
                          )}
                          {selectedStudent.parents.mother.occupationType === 'employed' && (
                            <>
                              <div className="detail-item">
                                <span className="detail-label">Employment Type:</span>
                                <span className="detail-value">{selectedStudent.parents.mother.employmentType || 'N/A'}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Organization/Company:</span>
                                <span className="detail-value">{selectedStudent.parents.mother.organizationName || 'N/A'}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Sector/Industry:</span>
                                <span className="detail-value">{selectedStudent.parents.mother.sector || 'N/A'}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Job Title / Designation:</span>
                                <span className="detail-value">{selectedStudent.parents.mother.designation || 'N/A'}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Years of Experience:</span>
                                <span className="detail-value">{selectedStudent.parents.mother.yearsOfExperience || 0}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Office Address:</span>
                                <span className="detail-value">{selectedStudent.parents.mother.officeAddress || 'N/A'}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Office Contact Number:</span>
                                <span className="detail-value">{selectedStudent.parents.mother.officeContactNumber || 'N/A'}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Official Email:</span>
                                <span className="detail-value">{selectedStudent.parents.mother.officeEmail || 'N/A'}</span>
                              </div>
                            </>
                          )}
                          {selectedStudent.parents.mother.occupationType === 'self-employed' && (
                            <>
                              <div className="detail-item">
                                <span className="detail-label">Business Name:</span>
                                <span className="detail-value">{selectedStudent.parents.mother.businessName || 'N/A'}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Business Type:</span>
                                <span className="detail-value">{selectedStudent.parents.mother.businessType || 'N/A'}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Industry:</span>
                                <span className="detail-value">{selectedStudent.parents.mother.businessIndustry || 'N/A'}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Your Role:</span>
                                <span className="detail-value">{selectedStudent.parents.mother.businessRole || 'N/A'}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Business Address:</span>
                                <span className="detail-value">{selectedStudent.parents.mother.businessAddress || 'N/A'}</span>
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Guardian Details */}
                {selectedStudent.parents && selectedStudent.parents.guardian && (
                  <div className="card-detail" style={{ marginBottom: '20px' }}>
                    <h4 style={{ marginBottom: '12px', color: '#2c3e50' }}>Guardian</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <span className="detail-label">Status:</span>
                        <span className="detail-value">{selectedStudent.parents.guardian.status === 'alive' ? 'Alive' : selectedStudent.parents.guardian.status === 'nil' ? 'Not Applicable' : 'Deceased'}</span>
                      </div>
                      {selectedStudent.parents.guardian.status === 'alive' && (
                        <>
                          <div className="detail-item">
                            <span className="detail-label">Name:</span>
                            <span className="detail-value">{selectedStudent.parents.guardian.name}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Contact:</span>
                            <span className="detail-value">{selectedStudent.parents.guardian.contactNumber}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Email:</span>
                            <span className="detail-value">{selectedStudent.parents.guardian.personalEmail || 'N/A'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Education:</span>
                            <span className="detail-value">{selectedStudent.parents.guardian.education}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Occupation Type:</span>
                            <span className="detail-value">{selectedStudent.parents.guardian.occupationType}</span>
                          </div>
                          {selectedStudent.parents.guardian.occupationType === 'employed' && (
                            <>
                              <div className="detail-item">
                                <span className="detail-label">Organization:</span>
                                <span className="detail-value">{selectedStudent.parents.guardian.organizationName}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Designation:</span>
                                <span className="detail-value">{selectedStudent.parents.guardian.designation}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Office Contact:</span>
                                <span className="detail-value">{selectedStudent.parents.guardian.officeContactNumber}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-label">Office Email:</span>
                                <span className="detail-value">{selectedStudent.parents.guardian.officeEmail}</span>
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </section>

              {/* Siblings in Engineering/Professional field */}
              {selectedStudent.hasSiblingsInIT && selectedStudent.siblings && selectedStudent.siblings.length > 0 && (
                <section className="detail-section">
                  <h3>Siblings in Engineering/Professional Field</h3>
                  {selectedStudent.siblings.map((sibling, index) => (
                    <div key={index} className="card-detail">
                      <h4 style={{ marginBottom: '12px', color: '#2c3e50' }}>Sibling {index + 1}</h4>
                      <div className="detail-grid">
                        <div className="detail-item">
                          <span className="detail-label">Name:</span>
                          <span className="detail-value">{sibling.name}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Gender:</span>
                          <span className="detail-value">{sibling.gender || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">WhatsApp Number:</span>
                          <span className="detail-value">{sibling.whatsappNumber || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Personal Email:</span>
                          <span className="detail-value">{sibling.personalEmail || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Highest Qualification:</span>
                          <span className="detail-value">{sibling.education}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Occupation Type:</span>
                          <span className="detail-value">{sibling.occupationType}</span>
                        </div>
                        {sibling.occupationType === 'homemaker' && (
                          <div className="detail-item">
                            <span className="detail-label">Previous Occupation:</span>
                            <span className="detail-value">{sibling.previousOccupation || 'N/A'}</span>
                          </div>
                        )}
                        {sibling.occupationType === 'employed' && (
                          <>
                            <div className="detail-item">
                              <span className="detail-label">Employment Type:</span>
                              <span className="detail-value">{sibling.employmentType || 'N/A'}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Organization/Company:</span>
                              <span className="detail-value">{sibling.organizationName || 'N/A'}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Sector/Industry:</span>
                              <span className="detail-value">{sibling.sector || 'N/A'}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Job Title / Designation:</span>
                              <span className="detail-value">{sibling.designation || 'N/A'}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Years of Experience:</span>
                              <span className="detail-value">{sibling.yearsOfExperience || 0}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Office Address:</span>
                              <span className="detail-value">{sibling.officeAddress || 'N/A'}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Office Contact Number:</span>
                              <span className="detail-value">{sibling.officeContactNumber || 'N/A'}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Official Email:</span>
                              <span className="detail-value">{sibling.officeEmail || 'N/A'}</span>
                            </div>
                          </>
                        )}
                        {sibling.occupationType === 'self-employed' && (
                          <>
                            <div className="detail-item">
                              <span className="detail-label">Business Name:</span>
                              <span className="detail-value">{sibling.businessName || 'N/A'}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Business Type:</span>
                              <span className="detail-value">{sibling.businessType || 'N/A'}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Industry:</span>
                              <span className="detail-value">{sibling.businessIndustry || 'N/A'}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Your Role:</span>
                              <span className="detail-value">{sibling.businessRole || 'N/A'}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Business Address:</span>
                              <span className="detail-value">{sibling.businessAddress || 'N/A'}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </section>
              )}

              {/* Professional Contacts - Including Employed Parents in Count */}
              {(selectedStudent.hasRelativesInIT || (selectedStudent.parents && ((selectedStudent.parents.father && selectedStudent.parents.father.occupationType === 'employed' && selectedStudent.parents.father.status === 'alive') || (selectedStudent.parents.mother && selectedStudent.parents.mother.occupationType === 'employed' && selectedStudent.parents.mother.status === 'alive')))) && (
                <section className="detail-section">
                  <h3>Professional Contacts</h3>
                  {selectedStudent.relativesInIT && selectedStudent.relativesInIT.map((relative, index) => (
                    <div key={index} className="card-detail">
                      <h4 style={{ marginBottom: '12px', color: '#2c3e50' }}>Contact {index + 1}</h4>
                      <div className="detail-grid">
                        <div className="detail-item">
                          <span className="detail-label">Name:</span>
                          <span className="detail-value">{relative.name}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Gender:</span>
                          <span className="detail-value">{relative.gender || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Contact Number:</span>
                          <span className="detail-value">{relative.contactNumber || relative.whatsappNumber || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Email:</span>
                          <span className="detail-value">{relative.email || relative.personalEmail || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Relationship:</span>
                          <span className="detail-value">{relative.relationship}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Whatsapp Number:</span>
                          <span className="detail-value">{relative.whatsappNumber || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Personal Email:</span>
                          <span className="detail-value">{relative.personalEmail || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Education:</span>
                          <span className="detail-value">{relative.education}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Occupation Type:</span>
                          <span className="detail-value">{relative.occupationType}</span>
                        </div>
                        {relative.occupationType === 'homemaker' && (
                          <div className="detail-item">
                            <span className="detail-label">Previous Occupation:</span>
                            <span className="detail-value">{relative.previousOccupation || 'N/A'}</span>
                          </div>
                        )}
                        {relative.occupationType === 'employed' && (
                          <>
                            <div className="detail-item">
                              <span className="detail-label">Employment Type:</span>
                              <span className="detail-value">{relative.employmentType || 'N/A'}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Company:</span>
                              <span className="detail-value">{relative.company || relative.organizationName || 'N/A'}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Sector:</span>
                              <span className="detail-value">{relative.sector || 'N/A'}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Designation:</span>
                              <span className="detail-value">{relative.designation || 'N/A'}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Work City:</span>
                              <span className="detail-value">{relative.workCity || (relative as any).city || 'N/A'}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Years Of Experience:</span>
                              <span className="detail-value">{relative.yearsOfExperience || 0}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Office Address:</span>
                              <span className="detail-value">{relative.officeAddress || 'N/A'}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Office Contact Number:</span>
                              <span className="detail-value">{relative.officeContactNumber || 'N/A'}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Office Email:</span>
                              <span className="detail-value">{relative.officeEmail || 'N/A'}</span>
                            </div>
                          </>
                        )}
                        {relative.occupationType === 'self-employed' && (
                          <>
                            <div className="detail-item">
                              <span className="detail-label">Business Name:</span>
                              <span className="detail-value">{relative.businessName || 'N/A'}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Business Type:</span>
                              <span className="detail-value">{relative.businessType || 'N/A'}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Industry:</span>
                              <span className="detail-value">{relative.businessIndustry || 'N/A'}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Your Role:</span>
                              <span className="detail-value">{relative.businessRole || 'N/A'}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Business Address:</span>
                              <span className="detail-value">{relative.businessAddress || 'N/A'}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </section>
              )}

              {/* Show message if no relatives */}
              {!selectedStudent.hasRelativesInIT && (
                <section className="detail-section">
                  <h3>Professional Contacts</h3>
                  <p className="no-data-message">No professional contacts in engineering or related fields.</p>
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FacultyDashboard;
