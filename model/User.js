import { model, Schema, Types } from 'mongoose';

const userSchema = new Schema({
  firstName: { type: String, required: true },
  userId: { type: Number, required: true, unique: true },
  joinedBy: { type: Number, ref: 'User' },
  joinedAt: { type: Date, default: Date.now },
  addedUsers: { type: Array, default: [] },
});

const User = model('User', userSchema);
export default User;
