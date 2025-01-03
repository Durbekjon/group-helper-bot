import User from '../model/User.js';

export const getRatings = async () => {
  const users = await User.find(); // Fetch only necessary fields
  return users.sort(
    (a, b) => (b.addedUsers?.length || 0) - (a.addedUsers?.length || 0)
  );
};

export const getUserResults = async (id) => {
  if (!id) throw new Error('User ID is required'); // Validation for missing ID

  const user = await User.findOne({ userId: id }, { addedUsers: 1 }); // Fetch only necessary fields
  return user?.addedUsers?.length || 0; // Safely handle null or undefined
};
