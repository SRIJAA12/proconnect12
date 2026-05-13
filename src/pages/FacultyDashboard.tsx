// Faculty Dashboard - View and Filter Student Data
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentAPI, isAuthenticated } from '../services/api';
import { Student } from '../types';
import './FacultyDashboard.css';

function FacultyDashboard() {
  const navigate = useNavigate();
  
  // State for company data
  const [companies, setCompanies] = useState<any[]>([]);
  const [filteredCompaniesData, setFilteredCompaniesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  
  // Keep student data for modal view
  const [students, setStudents] = useState<Student[]>([]);
  
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

  // Column header filter dropdown states (unused - can be removed if not needed)
  // const [showColumnFilterBranch, setShowColumnFilterBranch] = useState(false);
  // const [showColumnFilterSection, setShowColumnFilterSection] = useState(false);
  // const [showColumnFilterYear, setShowColumnFilterYear] = useState(false);
  // const [showColumnFilterContacts, setShowColumnFilterContacts] = useState(false);

  // State for modal
  const [showModal, setShowModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);

  // Get unique values for filter dropdowns
  const [branches] = useState<string[]>([
    'CSE', 'ECE', 'EEE', 'ICE', 'MECH', 'CIVIL', 'AIDS', 'CSBS' , 'VLSI'
  ]);

  // Check authentication on component mount
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/faculty/login');
    } else {
      fetchStudents();
    }
  }, [navigate]);

  // Extract companies from student data
  const extractCompaniesFromStudents = (studentData: Student[]) => {
    const companyMap = new Map();
    
    studentData.forEach(student => {
      // Extract from relatives in IT
      if (student.relativesInIT && student.relativesInIT.length > 0) {
        student.relativesInIT.forEach(relative => {
          const companyName = relative.company || relative.organizationName || relative.businessName;
          if (companyName && companyName.trim()) {
            const key = companyName.toLowerCase().trim();
            if (!companyMap.has(key)) {
              companyMap.set(key, {
                companyName: companyName.trim(),
                sector: relative.sector || '',
                workCity: relative.workCity || relative.officeAddress || '',
                students: [],
                contacts: []
              });
            }
            const company = companyMap.get(key);
            company.students.push({
              id: student.id,
              name: student.studentName,
              rollNumber: student.rollNumber,
              branch: student.branch,
              section: student.section,
              year: student.year,
              mobileNo: student.mobileNo,
              collegeMail: student.collegeMail
            });
            company.contacts.push({
              name: relative.name,
              relationship: relative.relationship,
              contactNumber: relative.contactNumber,
              whatsappNumber: relative.whatsappNumber,
              designation: relative.designation,
              email: relative.email || relative.personalEmail || relative.officeEmail
            });
          }
        });
      }
      
      // Extract from siblings
      if (student.siblings && student.siblings.length > 0) {
        student.siblings.forEach(sibling => {
          const companyName = sibling.company || sibling.organizationName || sibling.businessName;
          if (companyName && companyName.trim()) {
            const key = companyName.toLowerCase().trim();
            if (!companyMap.has(key)) {
              companyMap.set(key, {
                companyName: companyName.trim(),
                sector: sibling.sector || '',
                workCity: sibling.workCity || sibling.city || sibling.officeAddress || '',
                students: [],
                contacts: []
              });
            }
            const company = companyMap.get(key);
            company.students.push({
              id: student.id,
              name: student.studentName,
              rollNumber: student.rollNumber,
              branch: student.branch,
              section: student.section,
              year: student.year,
              mobileNo: student.mobileNo,
              collegeMail: student.collegeMail
            });
            company.contacts.push({
              name: sibling.name,
              relationship: 'Sibling',
              contactNumber: sibling.contactNumber,
              whatsappNumber: sibling.whatsappNumber,
              designation: sibling.designation,
              email: sibling.personalEmail || sibling.officeEmail
            });
          }
        });
      }
      
      // Extract from parents
      if (student.parents) {
        // Father
        if (student.parents.father && student.parents.father.status === 'alive') {
          const companyName = student.parents.father.organizationName || student.parents.father.businessName;
          if (companyName && companyName.trim()) {
            const key = companyName.toLowerCase().trim();
            if (!companyMap.has(key)) {
              companyMap.set(key, {
                companyName: companyName.trim(),
                sector: student.parents.father.sector || student.parents.father.businessIndustry || '',
                workCity: student.parents.father.workCity || student.parents.father.officeAddress || '',
                students: [],
                contacts: []
              });
            }
            const company = companyMap.get(key);
            company.students.push({
              id: student.id,
              name: student.studentName,
              rollNumber: student.rollNumber,
              branch: student.branch,
              section: student.section,
              year: student.year,
              mobileNo: student.mobileNo,
              collegeMail: student.collegeMail
            });
            company.contacts.push({
              name: student.parents.father.name,
              relationship: 'Father',
              contactNumber: student.parents.father.contactNumber,
              whatsappNumber: student.parents.father.whatsappNumber,
              designation: student.parents.father.designation,
              email: student.parents.father.personalEmail || student.parents.father.officeEmail
            });
          }
        }
        
        // Mother
        if (student.parents.mother && student.parents.mother.status === 'alive') {
          const companyName = student.parents.mother.organizationName || student.parents.mother.businessName;
          if (companyName && companyName.trim()) {
            const key = companyName.toLowerCase().trim();
            if (!companyMap.has(key)) {
              companyMap.set(key, {
                companyName: companyName.trim(),
                sector: student.parents.mother.sector || student.parents.mother.businessIndustry || '',
                workCity: student.parents.mother.workCity || student.parents.mother.officeAddress || '',
                students: [],
                contacts: []
              });
            }
            const company = companyMap.get(key);
            company.students.push({
              id: student.id,
              name: student.studentName,
              rollNumber: student.rollNumber,
              branch: student.branch,
              section: student.section,
              year: student.year,
              mobileNo: student.mobileNo,
              collegeMail: student.collegeMail
            });
            company.contacts.push({
              name: student.parents.mother.name,
              relationship: 'Mother',
              contactNumber: student.parents.mother.contactNumber,
              whatsappNumber: student.parents.mother.whatsappNumber,
              designation: student.parents.mother.designation,
              email: student.parents.mother.personalEmail || student.parents.mother.officeEmail
            });
          }
        }
        
        // Guardian
        if (student.parents.guardian && student.parents.guardian.status === 'alive') {
          const companyName = student.parents.guardian.organizationName || student.parents.guardian.businessName;
          if (companyName && companyName.trim()) {
            const key = companyName.toLowerCase().trim();
            if (!companyMap.has(key)) {
              companyMap.set(key, {
                companyName: companyName.trim(),
                sector: student.parents.guardian.sector || student.parents.guardian.businessIndustry || '',
                workCity: student.parents.guardian.workCity || student.parents.guardian.officeAddress || '',
                students: [],
                contacts: []
              });
            }
            const company = companyMap.get(key);
            company.students.push({
              id: student.id,
              name: student.studentName,
              rollNumber: student.rollNumber,
              branch: student.branch,
              section: student.section,
              year: student.year,
              mobileNo: student.mobileNo,
              collegeMail: student.collegeMail
            });
            company.contacts.push({
              name: student.parents.guardian.name,
              relationship: 'Guardian',
              contactNumber: student.parents.guardian.contactNumber,
              whatsappNumber: student.parents.guardian.whatsappNumber,
              designation: student.parents.guardian.designation,
              email: student.parents.guardian.personalEmail || student.parents.guardian.officeEmail
            });
          }
        }
      }
    });
    
    return Array.from(companyMap.values()).sort((a, b) => a.companyName.localeCompare(b.companyName));
  };

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

        const derivedName = (() => {
          const emailSource = basicInfo.college_mail || raw?.collegeMail || raw?.email || '';
          const localPart = (emailSource.split('@')[0] || '').replace(/[._-]+/g, ' ').trim();
          return localPart
            ? localPart.split(/\s+/).map((part: string) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
            : '';
        })();

        return {
          id: raw?._id || raw?.id || '',
          studentName: basicInfo.student_name || raw?.studentName || raw?.name || derivedName || basicInfo.roll_number || raw?.rollNumber || '',
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
      
      // Extract companies from student data
      const companiesData = extractCompaniesFromStudents(studentsData);
      setCompanies(companiesData);
      setFilteredCompaniesData(companiesData);
      
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
  }, [searchQuery, filterBranch, filterSection, filterHasRelatives, filterCity, filterDesignation, filterCompany, companies]);
  
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
  
  // Get unique cities from actual student data with enhanced typo correction (both relatives and siblings)
  const availableCities = useMemo(() => {
    const citySet = new Set<string>();
    const cityMap: { [key: string]: string } = {
      'banglore': 'Bangalore',
      'bangalor': 'Bangalore',
      'bengaluru': 'Bangalore',
      'bombay': 'Mumbai',
      'calcutta': 'Kolkata',
      'kolkatta': 'Kolkata',
      'delhi': 'Delhi',
      'new delhi': 'Delhi',
      'dilli': 'Delhi',
      'hyderabad': 'Hyderabad',
      'hyd': 'Hyderabad',
      'chenai': 'Chennai',
      'chenni': 'Chennai',
      'madras': 'Chennai',
      'pune': 'Pune',
      'poona': 'Pune',
      'coimbatore': 'Coimbatore',
      'coimbature': 'Coimbatore',
      'coimabatore': 'Coimbatore',
      'bangalore': 'Bangalore',
      'mumbai': 'Mumbai',
      'kolkata': 'Kolkata',
      'chennai': 'Chennai',
      'noida': 'Noida',
      'gurgaon': 'Gurugram',
      'gurugram': 'Gurugram',
      'trichy': 'Tiruchirappalli',
      'tirchy': 'Tiruchirappalli',
      'tiruchirapalli': 'Tiruchirappalli',
      'cochin': 'Kochi',
      'kochi': 'Kochi',
      'calicut': 'Kozhikode',
      'kozhikode': 'Kozhikode',
      'vizag': 'Visakhapatnam',
      'visakhapatnam': 'Visakhapatnam',
      'vijayawada': 'Vijayawada',
      'vijawada': 'Vijayawada'
    };
    
    students.forEach(student => {
      // From Professional Contacts (relativesInIT)
      if (student.relativesInIT && student.relativesInIT.length > 0) {
        student.relativesInIT.forEach(relative => {
          // Check both workCity and officeAddress fields
          if (relative.workCity) {
            const normalizedCity = relative.workCity.toLowerCase().trim();
            const correctedCity = cityMap[normalizedCity] || relative.workCity;
            citySet.add(correctedCity);
          }
          if (relative.officeAddress) {
            const normalizedCity = relative.officeAddress.toLowerCase().trim();
            const correctedCity = cityMap[normalizedCity] || relative.officeAddress;
            citySet.add(correctedCity);
          }
        });
      }
      
      // From Siblings (all siblings, not just those in IT)
      if (student.siblings && student.siblings.length > 0) {
        student.siblings.forEach(sibling => {
          // Check both city, workCity, and officeAddress fields
          if (sibling.city) {
            const normalizedCity = sibling.city.toLowerCase().trim();
            const correctedCity = cityMap[normalizedCity] || sibling.city;
            citySet.add(correctedCity);
          }
          if (sibling.workCity) {
            const normalizedCity = sibling.workCity.toLowerCase().trim();
            const correctedCity = cityMap[normalizedCity] || sibling.workCity;
            citySet.add(correctedCity);
          }
          if (sibling.officeAddress) {
            const normalizedCity = sibling.officeAddress.toLowerCase().trim();
            const correctedCity = cityMap[normalizedCity] || sibling.officeAddress;
            citySet.add(correctedCity);
          }
        });
      }
      
      // From Parents' work city and office address
      if (student.parents) {
        if (student.parents.father?.workCity) {
          const normalizedCity = student.parents.father.workCity.toLowerCase().trim();
          const correctedCity = cityMap[normalizedCity] || student.parents.father.workCity;
          citySet.add(correctedCity);
        }
        if (student.parents.father?.officeAddress) {
          const normalizedCity = student.parents.father.officeAddress.toLowerCase().trim();
          const correctedCity = cityMap[normalizedCity] || student.parents.father.officeAddress;
          citySet.add(correctedCity);
        }
        if (student.parents.mother?.workCity) {
          const normalizedCity = student.parents.mother.workCity.toLowerCase().trim();
          const correctedCity = cityMap[normalizedCity] || student.parents.mother.workCity;
          citySet.add(correctedCity);
        }
        if (student.parents.mother?.officeAddress) {
          const normalizedCity = student.parents.mother.officeAddress.toLowerCase().trim();
          const correctedCity = cityMap[normalizedCity] || student.parents.mother.officeAddress;
          citySet.add(correctedCity);
        }
        if (student.parents.guardian?.workCity) {
          const normalizedCity = student.parents.guardian.workCity.toLowerCase().trim();
          const correctedCity = cityMap[normalizedCity] || student.parents.guardian.workCity;
          citySet.add(correctedCity);
        }
        if (student.parents.guardian?.officeAddress) {
          const normalizedCity = student.parents.guardian.officeAddress.toLowerCase().trim();
          const correctedCity = cityMap[normalizedCity] || student.parents.guardian.officeAddress;
          citySet.add(correctedCity);
        }
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
  
  // Get unique designations from actual student data with enhanced normalization (both relatives and siblings)
  const availableDesignations = useMemo(() => {
    const designationSet = new Set<string>();
    
    // Common designation corrections and standardizations
    const designationMap: { [key: string]: string } = {
      'software engineer': 'Software Engineer',
      'sr software engineer': 'Senior Software Engineer',
      'senior software engineer': 'Senior Software Engineer',
      'jr software engineer': 'Junior Software Engineer',
      'junior software engineer': 'Junior Software Engineer',
      'sde': 'Software Development Engineer',
      'software developer': 'Software Developer',
      'dev': 'Developer',
      'programmer': 'Programmer',
      'tech lead': 'Technical Lead',
      'team lead': 'Team Lead',
      'project manager': 'Project Manager',
      'pm': 'Project Manager',
      'data scientist': 'Data Scientist',
      'data analyst': 'Data Analyst',
      'ml engineer': 'Machine Learning Engineer',
      'machine learning engineer': 'Machine Learning Engineer',
      'qa engineer': 'QA Engineer',
      'quality assurance': 'QA Engineer',
      'ui ux designer': 'UI/UX Designer',
      'ux designer': 'UX Designer',
      'ui designer': 'UI Designer',
      'full stack developer': 'Full Stack Developer',
      'frontend developer': 'Frontend Developer',
      'backend developer': 'Backend Developer',
      'web developer': 'Web Developer',
      'mobile developer': 'Mobile Developer',
      'android developer': 'Android Developer',
      'ios developer': 'iOS Developer',
      'devops engineer': 'DevOps Engineer',
      'cloud engineer': 'Cloud Engineer',
      'system admin': 'System Administrator',
      'network engineer': 'Network Engineer',
      'security engineer': 'Security Engineer',
      'test engineer': 'Test Engineer',
      'automation engineer': 'Automation Engineer',
      'product manager': 'Product Manager',
      'business analyst': 'Business Analyst',
      'solution architect': 'Solution Architect',
      'technical architect': 'Technical Architect',
      'cto': 'Chief Technology Officer',
      'ceo': 'Chief Executive Officer',
      'cfo': 'Chief Financial Officer',
      'hr manager': 'HR Manager',
      'hr': 'Human Resources',
      'teacher': 'Teacher',
      'professor': 'Professor',
      'lecturer': 'Lecturer',
      'doctor': 'Doctor',
      'engineer': 'Engineer',
      'manager': 'Manager'
    };
    
    const normalizeDesignation = (designation: string): string => {
      const normalized = designation
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
      
      return designationMap[normalized] || designation
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
    };
    
    students.forEach(student => {
      // From Professional Contacts (relativesInIT)
      if (student.relativesInIT && student.relativesInIT.length > 0) {
        student.relativesInIT.forEach(relative => {
          if (relative.designation) {
            const normalized = normalizeDesignation(relative.designation);
            designationSet.add(normalized);
          }
        });
      }
      
      // From Siblings in Engineering/Professional Field
      if (student.hasSiblingsInIT && student.siblings && student.siblings.length > 0) {
        student.siblings.forEach(sibling => {
          if (sibling.designation) {
            const normalized = normalizeDesignation(sibling.designation);
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
  const paginatedCompanies = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredCompaniesData.slice(startIndex, endIndex);
  }, [filteredCompaniesData, currentPage, itemsPerPage]);
  
  const totalPages = Math.ceil(filteredCompaniesData.length / itemsPerPage);

  // Filter logic
  const applyFilters = () => {
    let filtered = [...companies];

    // Filter by search query (searches in company name, sector, city)
    if (searchQuery) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(company => {
        const companyName = (company.companyName || '').toLowerCase();
        const sector = (company.sector || '').toLowerCase();
        const workCity = (company.workCity || '').toLowerCase();
        
        return companyName.includes(query) || 
               sector.includes(query) || 
               workCity.includes(query);
      });
    }

    // Filter by sector (case-insensitive)
    if (filterDesignation) {
      const sectorQuery = filterDesignation.toLowerCase();
      filtered = filtered.filter(company => 
        company.sector?.toLowerCase().includes(sectorQuery)
      );
    }

    // Filter by work city (case-insensitive)
    if (filterCity) {
      const cityQuery = filterCity.toLowerCase();
      filtered = filtered.filter(company => 
        company.workCity?.toLowerCase().includes(cityQuery)
      );
    }

    // Filter by company name (case-insensitive)
    if (filterCompany) {
      const companyQuery = filterCompany.toLowerCase();
      filtered = filtered.filter(company => 
        company.companyName?.toLowerCase().includes(companyQuery)
      );
    }

    // Filter by student branch (check if any student in the company matches)
    if (filterBranch) {
      const branchQuery = filterBranch.toLowerCase();
      filtered = filtered.filter(company => 
        company.students.some((student: any) => 
          student.branch?.toLowerCase().includes(branchQuery)
        )
      );
    }

    // Filter by student section (check if any student in the company matches)
    if (filterSection) {
      const sectionQuery = filterSection.toLowerCase();
      filtered = filtered.filter(company => 
        company.students.some((student: any) => 
          student.section?.toLowerCase().includes(sectionQuery)
        )
      );
    }

    // Filter by has professional contacts (companies with contacts)
    if (filterHasRelatives) {
      const hasContacts = filterHasRelatives === 'yes';
      filtered = filtered.filter(company => {
        const totalContacts = company.contacts.length;
        return hasContacts ? totalContacts > 0 : totalContacts === 0;
      });
    }

    setFilteredCompaniesData(filtered);
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

  // Delete company function
  const handleDeleteCompany = async (companyName: string) => {
    if (window.confirm(`Are you sure you want to delete ${companyName}? This will remove all associated student connections. This action cannot be undone.`)) {
      // Note: This would require backend API changes to properly handle company deletion
      // For now, we'll just remove it from the local state
      setCompanies(prev => prev.filter(company => company.companyName !== companyName));
      setFilteredCompaniesData(prev => prev.filter(company => company.companyName !== companyName));
      alert('Company removed successfully');
    }
  };

  // Open modal to view company details
  const handleViewDetails = (company: any) => {
    setSelectedCompany(company);
    setShowModal(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedCompany(null);
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
    };
    
    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // Export to CSV function
  const exportToCSV = () => {
    if (filteredCompaniesData.length === 0) {
      alert('No data to export');
      return;
    }

    // Create CSV content
    const headers = ['Company Name', 'Sector', 'Work City', 'Total Students', 'Total Contacts', 'Student Names', 'Student Roll Numbers', 'Contact Names', 'Contact Relationships'];
    const rows = filteredCompaniesData.map(company => [
      company.companyName || '',
      company.sector || '',
      company.workCity || '',
      company.students?.length || 0,
      company.contacts?.length || 0,
      company.students?.map((s: any) => s.name).join('; ') || '',
      company.students?.map((s: any) => s.rollNumber).join('; ') || '',
      company.contacts?.map((c: any) => c.name).join('; ') || '',
      company.contacts?.map((c: any) => c.relationship).join('; ') || ''
    ]);

    // Convert to CSV string
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    // Create and download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `companies_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="faculty-dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Faculty Dashboard</h1>
          <p className="dashboard-subtitle">PSGiTech Student Information Portal</p>
        </div>
      </header>

      <div className="dashboard-content">
        
        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{companies.length}</div>
            <div className="stat-label">Total Companies</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{students.length}</div>
            <div className="stat-label">Total Students</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {companies.filter(c => c.contacts.length > 0).length}
            </div>
            <div className="stat-label">Companies with Contacts</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {companies.reduce((acc, company) => acc + company.contacts.length, 0)}
            </div>
            <div className="stat-label">Total Professional Contacts</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{filteredCompaniesData.length}</div>
            <div className="stat-label">Filtered Results</div>
          </div>
        </div>

        {loadError && (
          <div className="dashboard-error-banner">
            {loadError}
          </div>
        )}

        {/* Main Filters Section */}
        <div className="main-filters-section">
          <div className="filter-row">
            <div className="filter-group">
              <label>Search (Company, Sector, City)</label>
              <input
                type="text"
                className="filter-input"
                placeholder="Search companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="filter-group">
              <label>Branch</label>
              <div className="autocomplete-container">
                <input
                  type="text"
                  className="filter-input"
                  placeholder="Select branch..."
                  value={branchInput}
                  onChange={(e) => {
                    const value = e.target.value;
                    setBranchInput(value);
                    setFilterBranch(value);
                    if (value) setShowBranchDropdown(true);
                  }}
                  onFocus={() => branchInput && setShowBranchDropdown(true)}
                />
                {showBranchDropdown && filteredBranches.length > 0 && (
                  <div className="autocomplete-dropdown" onMouseLeave={() => setShowBranchDropdown(false)}>
                    {filteredBranches.map((branch, index) => (
                      <div
                        key={index}
                        className="autocomplete-item"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setBranchInput(branch);
                          setFilterBranch(branch);
                          setShowBranchDropdown(false);
                        }}
                      >
                        {branch}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="filter-group">
              <label>Section</label>
              <div className="autocomplete-container">
                <input
                  type="text"
                  className="filter-input"
                  placeholder="Select section..."
                  value={sectionInput}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSectionInput(value);
                    setFilterSection(value);
                    if (value) setShowSectionDropdown(true);
                  }}
                  onFocus={() => sectionInput && setShowSectionDropdown(true)}
                />
                {showSectionDropdown && filteredSections.length > 0 && (
                  <div className="autocomplete-dropdown" onMouseLeave={() => setShowSectionDropdown(false)}>
                    {filteredSections.map((section, index) => (
                      <div
                        key={index}
                        className="autocomplete-item"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSectionInput(section);
                          setFilterSection(section);
                          setShowSectionDropdown(false);
                        }}
                      >
                        {section}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="filter-group">
              <label>Has Professional Contacts</label>
              <select
                className="filter-select"
                value={filterHasRelatives}
                onChange={(e) => setFilterHasRelatives(e.target.value)}
              >
                <option value="">All</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>
        </div>

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
                  if (value) setShowDesignationDropdown(true);
                }}
                onFocus={() => designationInput && setShowDesignationDropdown(true)}
              />
              {showDesignationDropdown && filteredDesignations.length > 0 && (
                <div className="autocomplete-dropdown" onMouseLeave={() => setShowDesignationDropdown(false)}>
                  {filteredDesignations.map((designation, index) => (
                    <div
                      key={index}
                      className="autocomplete-item"
                      onMouseDown={(e) => {
                        e.preventDefault();
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
                  if (value) setShowCompanyDropdown(true);
                }}
                onFocus={() => companyInput && setShowCompanyDropdown(true)}
              />
              {showCompanyDropdown && filteredCompanies.length > 0 && (
                <div className="autocomplete-dropdown" onMouseLeave={() => setShowCompanyDropdown(false)}>
                  {filteredCompanies.map((company, index) => (
                    <div
                      key={index}
                      className="autocomplete-item"
                      onMouseDown={(e) => {
                        e.preventDefault();
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
                  if (value) setShowCityDropdown(true);
                }}
                onFocus={() => cityInput && setShowCityDropdown(true)}
              />
              {showCityDropdown && filteredCities.length > 0 && (
                <div className="autocomplete-dropdown" onMouseLeave={() => setShowCityDropdown(false)}>
                  {filteredCities.map((city, index) => (
                    <div
                      key={index}
                      className="autocomplete-item"
                      onMouseDown={(e) => {
                        e.preventDefault();
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
                    {filteredCompaniesData.length === 0 
                    ? (students.length > 0
                      ? "No company groups found yet. Student records are shown below."
                      : "No companies found matching your filters.")
                    : `Showing ${((currentPage - 1) * itemsPerPage) + 1} to ${Math.min(currentPage * itemsPerPage, filteredCompaniesData.length)} of ${filteredCompaniesData.length} results`
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
              {filteredCompaniesData.length > 0 && (
                <>
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>
                            <div className="th-header">
                              <span>Company Name</span>
                            </div>
                          </th>
                          <th>
                            <div className="th-header">
                              <span>Sector</span>
                            </div>
                          </th>
                          <th>
                            <div className="th-header">
                              <span>Work City</span>
                            </div>
                          </th>
                          <th>
                            <div className="th-header">
                              <span>Students</span>
                            </div>
                          </th>
                          <th>
                            <div className="th-header">
                              <span>Contacts</span>
                            </div>
                          </th>
                          <th>
                            <div className="th-header">
                              <span>Actions</span>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedCompanies.map((company, index) => (
                          <tr key={index}>
                            <td className="td-name">{company.companyName}</td>
                            <td><span className="badge">{company.sector || 'N/A'}</span></td>
                            <td>{company.workCity || 'N/A'}</td>
                            <td className="td-center">
                              <span className="badge badge-info">
                                {company.students.length} Student(s)
                              </span>
                            </td>
                            <td className="td-center">
                              {company.contacts.length > 0 ? (
                                <span className="badge badge-success">
                                  {company.contacts.length} Contact(s)
                                </span>
                              ) : (
                                <span className="badge badge-gray">None</span>
                              )}
                            </td>
                            <td>
                              <div className="action-buttons">
                                <button
                                  className="btn-view"
                                  onClick={() => handleViewDetails(company)}
                                >
                                  View
                                </button>
                                <button
                                  className="btn-delete"
                                  onClick={() => handleDeleteCompany(company.companyName)}
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

              {/* Student Records Section */}
              {students.length > 0 && (
                <div style={{ marginTop: '30px' }}>
                  <div className="results-summary" style={{ marginBottom: '16px' }}>
                    <span>Student Records ({students.length})</span>
                  </div>
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Roll Number</th>
                          <th>Branch</th>
                          <th>Section</th>
                          <th>Year</th>
                          <th>Email</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((student, index) => (
                          <tr key={student.id || index}>
                            <td className="td-name">{student.studentName || 'N/A'}</td>
                            <td>{student.rollNumber || 'N/A'}</td>
                            <td>{student.branch || 'N/A'}</td>
                            <td>{student.section || 'N/A'}</td>
                            <td>{student.year || 'N/A'}</td>
                            <td>{student.collegeMail || 'N/A'}</td>
                            <td>
                              <span className="badge">{(student as any).status || 'submitted'}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal for viewing company details */}
      {showModal && selectedCompany && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Company Details</h2>
              <button className="modal-close" onClick={handleCloseModal}>×</button>
            </div>
            
            <div className="modal-body">
              {/* Company Information */}
              <section className="detail-section">
                <h3>Company Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Company Name:</span>
                    <span className="detail-value">{selectedCompany.companyName}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Sector:</span>
                    <span className="detail-value">{selectedCompany.sector || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Work City:</span>
                    <span className="detail-value">{selectedCompany.workCity || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Total Students:</span>
                    <span className="detail-value">{selectedCompany.students?.length || 0}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Total Contacts:</span>
                    <span className="detail-value">{selectedCompany.contacts?.length || 0}</span>
                  </div>
                </div>
              </section>

              {/* Students Information */}
              <section className="detail-section">
                <h3>Associated Students</h3>
                {selectedCompany.students && selectedCompany.students.length > 0 ? (
                  <div className="students-grid">
                    {selectedCompany.students.map((student: any, index: number) => (
                      <div key={index} className="student-card" style={{ marginBottom: index < selectedCompany.students.length - 1 ? '20px' : '0' }}>
                        <h4 className="student-number">Student {index + 1}</h4>
                        <div className="detail-grid">
                          <div className="detail-item">
                            <span className="detail-label">Name:</span>
                            <span className="detail-value">{student.name}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Roll Number:</span>
                            <span className="detail-value">{student.rollNumber}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Branch:</span>
                            <span className="detail-value">{student.branch}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Section:</span>
                            <span className="detail-value">{student.section || 'N/A'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Year:</span>
                            <span className="detail-value">{student.year}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Mobile:</span>
                            <span className="detail-value">{student.mobileNo}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Email:</span>
                            <span className="detail-value">{student.collegeMail}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="dashboard-empty">No students associated with this company.</p>
                )}
              </section>

              {/* Professional Contacts Information */}
              <section className="detail-section">
                <h3>Professional Contacts</h3>
                {selectedCompany.contacts && selectedCompany.contacts.length > 0 ? (
                  <div className="contacts-grid">
                    {selectedCompany.contacts.map((contact: any, index: number) => (
                      <div key={index} className="contact-card">
                        <div className="detail-grid">
                          <div className="detail-item">
                            <span className="detail-label">Name:</span>
                            <span className="detail-value">{contact.name}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Relationship:</span>
                            <span className="detail-value">{contact.relationship}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Contact Number:</span>
                            <span className="detail-value">{contact.contactNumber}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">WhatsApp:</span>
                            <span className="detail-value">{contact.whatsappNumber || 'N/A'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Designation:</span>
                            <span className="detail-value">{contact.designation || 'N/A'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Email:</span>
                            <span className="detail-value">{contact.email || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="dashboard-empty">No professional contacts associated with this company.</p>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FacultyDashboard;
