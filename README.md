# School Cleaning Management System

A comprehensive management system designed for high school cleaning days, providing students with announcement queries, class monitors for area assignment, inspectors for verification, and administrators with backend management capabilities.

## Features

### 📢 Announcements & Query System (Students)
- View the latest announcements and notifications
- Browse cleaning area information
- Real-time status updates

### 🧹 Area Assignment System (Class Monitors)
- Assign cleaning areas to classes
- Record cleaning staff lists
- Manage area responsibilities

### ✅ Area Inspection System (Inspectors)
- Review cleaning area completion status
- Record verification results
- Provide feedback for improvements

### 🛠️ Administrative Backend (Teachers/Administrators)
- Publish and manage announcements
- Configure cleaning areas
- Manage user roles and permissions
- Export sign-out reports

## Tech Stack

- **Frontend Framework**: HTML5 + Vanilla JavaScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Backend Service**: [Supabase](https://supabase.com/) (PostgreSQL + Real-time Database)
- **Authentication**: Password-based authentication system

## Getting Started

### Requirements
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection

### Installation & Usage

1. **Open the Application**
   - Open `index.html` directly in a browser, or serve it via an HTTP server

2. **Access Different User Roles**
   - Regular Student: Default role, can view announcements and area information
   - Class Monitor: Login with class number and password
   - Inspector: Login with inspection password
   - Administrator: Login with admin email and password

## Project Structure

```
returntoschool/
├── index.html          # Main application page
├── scripts.js          # Core logic and feature modules
├── style.css           # Custom styling
├── README.md           # This file
└── LICENSE.md          # GPLv3 Open Source License
```

## User Guide

### Announcements & Queries
1. Open the application homepage
2. Check the "Announcements" section for the latest information
3. Browse the area list in "Area Management"

### Class Monitor Workflow
1. Click "Class Monitor Login"
2. Enter class number and password for verification
3. Assign cleaning areas to the class
4. Record the list of cleaning staff

### Inspector Verification Process
1. Click "Inspector Login"
2. Enter inspection password
3. Verify each cleaning area's completion status
4. Record verification results

### Administrator Backend
1. Login with administrator email and password
2. Publish new announcements
3. Add or edit cleaning area information
4. Manage user roles
5. Export various reports

## API & Database

This system uses Supabase as the backend service with data stored in PostgreSQL. Key tables include:
- `announcements` - Announcement information
- `areas` - Cleaning area information
- `assignments` - Class area assignments
- `inspections` - Verification records
- `users` - User role management

## Security

- Password-based authentication
- Role-based access control for different user types
- Data encrypted via HTTPS
- Additional verification for sensitive operations

## Browser Compatibility

| Browser | Version Support |
|---------|-----------------|
| Chrome  | Latest          |
| Firefox | Latest          |
| Safari  | Latest          |
| Edge    | Latest          |

## FAQ

**Q: How do I reset my password?**
A: Please contact the system administrator to reset your password.

**Q: How often are announcements updated?**
A: Announcements are published in real-time by administrators, usually immediately after decisions are made.

**Q: How do I export cleaning records?**
A: Administrators can click the "Download Absent Sign-out List" button in the backend to export records.

## License

This project is licensed under GPLv3. See [LICENSE.md](LICENSE.md) for details.

## Contact

For questions or suggestions, please contact the system administrator.
Email: cpsd6th@gmail.com

## Maintainer
* [@chupei-software-development](https://github.com/chupei-software-development) - Owner
* [@August980422](https://github.com/August980422) - Developer/Maintainer
* [@294Ryan](https://github.com/294Ryan) - Maintainer
* [@cpyc234-sketch](https://github.com/cpyc234-sketch) - Operator

---

**Last Updated**: July 2026
