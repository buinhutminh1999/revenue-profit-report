import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Breadcrumbs from './Breadcrumbs';
import './Layout.css';

const Layout = () => {
  return (
    <>
      <Header />
      <Breadcrumbs />
      <div className="main-content">
        <Outlet />
      </div>
    </>
  );
};

export default Layout;
