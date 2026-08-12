import { Helmet } from 'react-helmet-async';
import { useAuth } from '../../contexts/AuthContext';

export default function SEO({ title, description, keywords }) {
  const { company } = useAuth() || {};
  const siteTitle = company?.name || 'SoluoPrint';
  const fullTitle = title ? `${title} | ${siteTitle}` : `${siteTitle} | Ultimate Print Shop Management System`;
  const defaultDesc = 'SoluoPrint - The complete solution for modern print shops. Manage jobs, customers, payments, and expenses with ease.';

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description || defaultDesc} />
      {keywords && <meta name="keywords" content={keywords} />}
      
      {/* Open Graph / Facebook */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description || defaultDesc} />
      
      {/* Twitter */}
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description || defaultDesc} />
    </Helmet>
  );
}
