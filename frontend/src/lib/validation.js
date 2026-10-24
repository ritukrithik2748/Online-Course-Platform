const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isEmail(value) {
  return EMAIL_PATTERN.test(String(value || "").trim());
}

export function validateLogin(values) {
  const errors = {};
  if (!values.email?.trim()) errors.email = "Email is required.";
  else if (!isEmail(values.email)) errors.email = "Enter a valid email address.";
  if (!values.password) errors.password = "Password is required.";
  return errors;
}

export function validateSignup(values) {
  const errors = {};
  if (!values.firstName?.trim()) errors.firstName = "First name is required.";
  else if (values.firstName.trim().length < 2) errors.firstName = "Use at least 2 characters.";
  if (!values.lastName?.trim()) errors.lastName = "Last name is required.";
  else if (values.lastName.trim().length < 2) errors.lastName = "Use at least 2 characters.";
  if (!values.email?.trim()) errors.email = "Email is required.";
  else if (!isEmail(values.email)) errors.email = "Enter a valid email address.";
  if (!values.password) errors.password = "Password is required.";
  else if (values.password.length < 6) errors.password = "Use at least 6 characters.";
  else if (values.password.length > 128) errors.password = "Keep it under 128 characters.";
  if (!values.confirmPassword) errors.confirmPassword = "Confirm your password.";
  else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = "Passwords do not match.";
  }
  if (!["student", "instructor"].includes(values.role)) errors.role = "Choose an account type.";
  return errors;
}

export function validateProfile(values) {
  const errors = {};
  if (!values.firstName?.trim()) errors.firstName = "First name is required.";
  if (!values.lastName?.trim()) errors.lastName = "Last name is required.";
  if (values.country && values.country.length > 60) errors.country = "Keep it under 60 characters.";
  if (values.profilePicture && values.profilePicture.length > 500) {
    errors.profilePicture = "URL is too long.";
  }
  if (values.profilePicture && !/^https?:\/\//i.test(values.profilePicture)) {
    errors.profilePicture = "Use a full http(s) image URL.";
  }
  if (values.bio && values.bio.length > 2000) errors.bio = "Bio must be under 2000 characters.";
  return errors;
}

export function validatePassword(values) {
  const errors = {};
  if (!values.currentPassword) errors.currentPassword = "Enter your current password.";
  if (!values.newPassword) errors.newPassword = "Enter a new password.";
  else if (values.newPassword.length < 6) errors.newPassword = "Use at least 6 characters.";
  else if (values.newPassword === values.currentPassword) {
    errors.newPassword = "Choose a password you have not used here.";
  }
  if (values.confirmPassword !== values.newPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }
  return errors;
}

export function validateCourse(values) {
  const errors = {};
  if (!values.title?.trim()) errors.title = "A course title is required.";
  else if (values.title.trim().length < 3) errors.title = "Use at least 3 characters.";
  if (!values.categoryId) errors.categoryId = "Choose a category.";
  if (values.price === "" || values.price === null || values.price === undefined) {
    errors.price = "Set a price (0 for free).";
  } else if (Number(values.price) < 0 || Number.isNaN(Number(values.price))) {
    errors.price = "Price must be zero or more.";
  }
  if (values.thumbnailUrl && !/^https?:\/\//i.test(values.thumbnailUrl)) {
    errors.thumbnailUrl = "Use a full http(s) image URL.";
  }
  return errors;
}

export function validateReview(values) {
  const errors = {};
  if (!values.rating || values.rating < 1 || values.rating > 5) {
    errors.rating = "Pick a star rating.";
  }
  if (values.comment && values.comment.length > 2000) {
    errors.comment = "Keep your review under 2000 characters.";
  }
  return errors;
}
