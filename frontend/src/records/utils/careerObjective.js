// Only publish the description belonging to the currently selected objective.
export function getCareerObjectiveDescription(record) {
  let details = record?.career_objective_details;
  if (typeof details === 'string') {
    try { details = JSON.parse(details); } catch { return ''; }
  }
  const objective = record?.career_objectives;
  if (!['Placement', 'Core', 'Software', 'Placement - Core', 'Placement - Software', 'Higher Studies', 'Startup', 'Entrepreneur', 'Enterpreneur'].includes(objective)) return '';
  let value = details?.[objective];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === 'object' && parsed !== null) {
        value = parsed;
      }
    } catch {}
  }
  if (typeof value === 'object' && value !== null) {
    const parts = [];
    // Higher Studies fields
    if (value.exam) parts.push(`Exam: ${value.exam}`);
    if (value.degree) parts.push(`Degree: ${value.degree}`);
    if (value.university) parts.push(`University: ${value.university}`);
    if (value.preparation_platform || value.platform_name || value.online_platform) {
      const plat = value.preparation_platform
        ? `${value.preparation_platform}${value.platform_name ? ` (${value.platform_name})` : ''}`
        : (value.platform_name || value.online_platform);
      parts.push(`Platform: ${plat}`);
    }
    if (value.attended_test || value.test_count || value.score || value.test_name) {
      if (value.test_count) parts.push(`Tests: ${value.test_count}`);
      if (value.test_name) parts.push(`Test: ${value.test_name}`);
      if (value.score) parts.push(`Score: ${value.score}`);
    }
    // Entrepreneur fields
    if (value.business_type) parts.push(`Type: ${value.business_type}`);
    if (value.field) parts.push(`Field: ${value.field}`);
    if (value.business_type === 'Own Business' || value.business_type === 'Own') {
      if (value.business_details) parts.push(`Details: ${value.business_details}`);
      const branchesPlan = value.branches_to_open !== undefined && value.branches_to_open !== '' ? value.branches_to_open : value.expand;
      if (branchesPlan !== undefined && branchesPlan !== '') parts.push(`Branches plan to open: ${branchesPlan}`);
      if (value.funding) parts.push(`Funding: ${value.funding}`);
      else if (value.upgrade) parts.push(`Funding: ${value.upgrade}`);
    } else {
      if (value.generation) parts.push(`Generation: ${value.generation}`);
      if (value.expand !== undefined && value.expand !== '') parts.push(`Branches Opened: ${value.expand}`);
      if (value.upgrade) parts.push(`Upgrade: ${value.upgrade}`);
    }

    return parts.join(' | ') || '';
  }
  return typeof value === 'string' ? value.trim() : '';
}

export function getCareerObjectiveLabel(objective) {
  if (objective === 'Higher Studies') {
    return 'Higher Studies Details';
  }
  if (objective === 'Entrepreneur' || objective === 'Enterpreneur') {
    return 'Entrepreneur Details';
  }
  return ['Placement', 'Core', 'Software', 'Placement - Core', 'Placement - Software'].includes(objective)
    ? 'Dream Company'
    : `${objective || 'Career Objective'} Description`;
}

