import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/apiError.js"
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";

const generateAccessAndRefereshTokens = async(userId) =>{
   try {
      const user = await User.findById(userId)
      const accessToken = user.generateAccessToken()
      const refreshToken = user.generateRefreshToken()

      user.refreshToken = refreshToken
      await user.save({ validationBeforeSave: false})
      // console.log(refreshToken,
      //    accessToken)
      return {accessToken, refreshToken}
      

   } catch (error) {
      throw new ApiError (400, "something went wrong")
   }
}

const registerUser = asyncHandler(async(req, res) =>{
   //get user details by frontend

   const{fullName, email, username, password} = req.body
   // console.log("email =" ,email);

   //validation - not empty

   if(
      [fullName, email, username, password].some((field) => field?.trim() === "")
   ){
      throw new ApiError (400, "All fields are required")
   }

   //check if user already registered : email, username

   const existedUser = await User.findOne({
      $or: [{ username },{ email }]
   })

   if (existedUser) {
      throw new ApiError (409, "User with this email or username is already exsisted")
   }
   //check for images, avatar

   const avatarLocalPath = req.files?.avatar[0]?.path;
   // const coverImageLocalPath = req.files?.coverImage[0]?.path;
   // console.log(coverImageLocalPath)

   let coverImageLocalPath;
   if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
      coverImageLocalPath = req.files.coverImage[0].path
   }

   if (!avatarLocalPath) {
      throw new ApiError (400, "avatar file is required")
   }

   //upload them in cloudinary

   const avatar = await uploadOnCloudinary(avatarLocalPath)
   const coverImage = await uploadOnCloudinary(coverImageLocalPath)
   // console.log(coverImage)

   if (!avatar) {
      throw new ApiError (400, "avatar file is required")
   }

   //create user object in db
   
   const user = await User.create({
      fullName,
      coverImage : coverImage?.url || "",
      avatar : avatar.url,
      email,
      password,
      username: username.toLowerCase(),
   })
   
   //remove password and token in the response
   
   const createUser = await User.findById(user._id).select("-password -refreshToken")
   //check the user creation
   
   if(!createUser){
      throw new ApiError(500, "Something went wrong while registering the user")
   }
   //return res
   return res.status(201).json(
      new ApiResponse(200, createUser, "user registered sucessfully")
   )
})

const loginUser = asyncHandler(async(req, res) => {
   // req body - data
   const {username, email, password} = req.body

   // check username and email
   if (!username && !email) {
      throw new ApiError (400, "username and email is required")
   }

   // find the user

   const user = await User.findOne({
     $or : [{username}, {email}] 
   })

   if (!user) {
      throw new ApiError (404, "user doesn't exsist")
   }
   // password check

   const isPasswordValid = await user.isPasswordCorrect(password)

   if (!isPasswordValid) {
      throw new ApiError (401, "password incorrect")
   }
   // refresh token & access token generate

   const {accessToken, refreshToken} = await generateAccessAndRefereshTokens(user._id)
   
   const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
   // send cookies
   const options = {
      httpOnly: true,
      secure: true
   }

   return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json(
      new ApiResponse(
         200,
         {
            user: loggedInUser, accessToken, refreshToken
            
         },
         "user Logged In Successfully"
      )
   )
   
})

const logoutUser = asyncHandler(async(req,res)=>{
   await User.findByIdAndUpdate(
      req.user._id,
      {
         $unset:{
            refreshToken : undefined
         }
      },
      {
         new: true
      }
   )
   const options = {
      httpOnly: true,
      secure: true
   }

   return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken",options)
   .json(new ApiResponse(200, {}, "user logged out"))
})

const refreshAccessToken = asyncHandler(async(req,res) =>{
   const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken

   if (!incomingRefreshToken) {
      throw new ApiError(401, "unauthorized request")
   }

   try {
      const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
   
      const user = await User.findById(decodedToken?._id)
   
      
      if (!user) {
         throw new ApiError(401, "invalid refresh token")
      }
   
   
      if (incomingRefreshToken !== user.refreshToken) {
         throw new ApiError(401, "refreshed token is expired or used")
      }
   
      const {accessToken, newRefreshToken} =  await generateAccessAndRefereshTokens(user._id)
   
      const options = {
         httpOnly: true,
         secure: true
      }
   
      return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", newRefreshToken, options)
      .json(
         new ApiResponse(
            200,
            {accessToken, refreshToken: newRefreshToken},
            "accessToken is refreshed"
         )
      )
   } catch (error) {
      throw new ApiError (401, error?.message || "invalid refresh token")
   }
})

const changeCurrentPassword = asyncHandler(async(req,res) =>{
   const {oldPassword, newPassword} = req.body

   const user = await User.findById(req.user?._id)
   const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

   if (!isPasswordCorrect) {
      throw new ApiError (400, "password is invalid")
   }

   user.password = newPassword
   await user.save({validationBeforeSave: false})

   return res
   .status(200)
   .json(new ApiResponse(200, {}, "password change successfully"))
})

const getCurrentUser = asyncHandler(async(req,res) =>{
   return res.status(200)
   .json(200, req.user, "current user fetched succesfully")
})

const updateAccountDetails = asyncHandler(async(req,res) => {
   const {fullName, email} = req.body

   if (!fullName || !email) {
      throw new ApiError(400, "all fields requried")
   }

   const user = await User.findByIdAndUpdate(req.user?._id,{
      $set: {
         fullName,
         email: email,
      },
      }, {new: true}
   ).select("-password")

   return res
   .status(200)
   .json(new ApiResponse (200,user,"account details updated"))
})

const updateUserAvatar = asyncHandler(async(req, res) =>{
   const avatarLocalPath = req.file?.path

   if (!avatarLocalPath) {
      throw new ApiError (400, "avatar file is missing")
   }

   const avatar = await uploadOnCloudinary (avatarLocalPath)

   if (!avatar.url) {
      throw new ApiError (400, "error while uploading an avatar")
   }

   const user = await User.findByIdAndUpdate(req.user?._id,{
      $set:{
         avatar: avatar.url,
      }
   },{new: true}).select("-password")

   return res
   .status(200)
   .json(new ApiResponse(200, user, "avatar update successfully"))
})

const updateUserCoverImage = asyncHandler(async(req, res) =>{
   const coverImageLocalPath = req.file?.path

   if (!coverImageLocalPath) {
      throw new ApiError (400, "coverImage file is missing")
   }

   const coverImage = await uploadOnCloudinary (coverImageLocalPath)

   if (!coverImage.url) {
      throw new ApiError (400, "error while uploading an avatar")
   }

   const user = await User.findByIdAndUpdate(req.user?._id,{
      $set:{
         coverImage: coverImage.url,
      }
   },{new: true}).select("-password")

   return res
   .status(200)
   .json(new ApiResponse(200, user, "coverImage update successfully"))
})

const getUserChannelProfile = asyncHandler(async(req,res) => {
   const {username} = req.params

   if (!username?.trim()) {
      throw new ApiError (400, "username is missing")
   }

   const channel = await User.aggregate([{
      $match: {
         username: username?.toLowerCase()
      }
   },
   {
      $lookup:{
         from: "subscriptions",
         localField: "_id",
         foreignField: "channel",
         as: "subscribers"
      }
   },
   {
      $lookup:{
         from: "subscriptions",
         localField: "_id",
         foreignField: "subscriber",
         as: "subscriberedTo"
      }
   },
   {
      $addFields:{
         subscribersCount:{
            $size: "$subscribers"
         },
         channelSubscribedToCount:{
            $size: "$subscriberedTo"
         },
         isSubscribed:{
            $cond:{
               if: {$in : [req.user?._id, "$subscribers.subscriber"]},
               then: true,
               else: false    
            }
         }
      }
   },
   {
      $project:{
         fullName: 1,
         username: 1,
         subscribersCount: 1,
         channelSubscribedToCount: 1,
         isSubscribed: 1,
         avatar: 1,
         coverImage: 1,
         email: 1,
      }
   }
   ])

   if (!channel?.length) {
      throw new ApiError (404, "channel doesn't exsist")
   }

   return res.status(200).json(new ApiResponse(200, channel[0], "user channel fetched sucessfully"))
})

const getWatchHistory = asyncHandler(async(req,res) =>{
   const user = await User.aggregate([
      {
         $match: {
            _id: new mongoose.Types.ObjectId(req.user._id)
         }
      },
      {
         $lookup:{
            from:"videos",
            localField: "watchHistory",
            foreignField: "_id",
            as: "watchHistory",
            pipeline:[
               {
                  $lookup:{
                     from:"users",
                     localField: "owner",
                     foreignField: "_id",
                     as: "owner",
                     pipeline:[
                        {
                           $project:{
                              fullName: 1,
                              username: 1,
                              avatar: 1,
                           }
                        }
                     ]
                  }
               },
               {
                  $addFields:{
                     owner:{
                        $first: "$owner"
                     }
                  }
               }
            ]
         }
      }
   ])

   return res.status(200)
   .json( new ApiResponse(
      200,
      user[0].watchHistory,
      "watch history fetched sucessfully"
   ))
})

export {
   registerUser,
   loginUser,
   logoutUser,
   refreshAccessToken,
   changeCurrentPassword,
   getCurrentUser,
   updateAccountDetails,
   updateUserAvatar,
   updateUserCoverImage,
   getUserChannelProfile,
   getWatchHistory
}
