
import mongoose, {isValidObjectId, mongo} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {deleteFromCloudinary, uploadOnCloudinary} from "../utils/cloudinary.js"
import { upload } from "../middlewares/multer.middleware.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query="", sortBy ="createdAt", sortType=1, userId } = req.query
    //TODO: get all videos based on query, sort, pagination

    let pipeline=[{
        $match:{
            $and:[{
                $or:[{
                    title:{$regex: query, $options: "i"}
                },{
                    discription:{$regex: query, $options: "i"}
                }]
            },
        ...(userId?[{owner: new mongoose.Types.ObjectId(userId)}]: "")]
        }
    },{
        $lookup:{
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "owner",
            pipeline:[{
                $project:{
                    _id: 1,
                    username: 1,
                    fullName: 1,
                    avatar: 1
                }
            }]
        }
    },{
        $addFields:{
            owner:{
                $first:"$owner"
            }
        }
    },{
        $sort: {[sortBy]:sortType}
    }]

    const options={
        page: parseInt(page),
        limit: parseInt(limit),
        customLable:{
            totalDocs : "totalvideos",
            docs: "videos"
        }
    }

    const result = await Video.aggregatePaginate(Video.aggregate(pipeline), options)

    if ( result?.videos?.length === 0 ) { return res.status( 404 ).json( new ApiResponse( 404, {}, "No Videos Found" ) ); }


    return res.status(200).json(new ApiResponse(200, result, "video fetched"))
})

const publishAllVideo = asyncHandler(async (req, res) => {
    const { title, discription} = req.body
    // TODO: get video, upload to cloudinary, create video
    if (!(title && discription)) {
        throw new ApiError (400, "title and discription is required")
    }

    // const videoFileLocalPath = req.files?.videoFile[ 0 ]?.path;
    // const thumbnailLocalPath = req.files?.thumbnail[ 0 ]?.path;
    let videoFileLocalPath;
    if (req.files && Array.isArray(req.files.videoFile) && req.files.videoFile.length > 0) {
       videoFileLocalPath = req.files.videoFile[0].path
    }

    let thumbnailLocalPath;
    if (req.files && Array.isArray(req.files.thumbnail) && req.files.thumbnail.length > 0) {
       thumbnailLocalPath = req.files.thumbnail[0].path
    }

    if (!videoFileLocalPath) {
        throw new ApiError(400, "video is required")
    }
    if (!thumbnailLocalPath) {
        throw new ApiError(400, "thumbnail is required")
    }

    const videoFile = await uploadOnCloudinary(videoFileLocalPath, "video")
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath, "img")

    // console.log(videoFile, thumbnail)
    if (!videoFile) {
        throw new ApiError(400, "video is fail to upload")
    }
    if (!thumbnail) {
        throw new ApiError(400, "thumbnail is fail to upload")
    }

    const video = await Video.create({
        title,
        discription,
        videoFile : videoFile.secure_url,
        thumbnail: thumbnail.secure_url,
        duration: videoFile.duration,
        owner: req.user?._id
    })

    if (!video) {
        throw new ApiError(400, "DB document creation failed")
    }

    return res.status(200).json(new ApiResponse(200, video, "video uploaded sucessfully"))
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id

    if (!isValidObjectId(videoId)) {
        throw new ApiError (400, "please add valid video id")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(400, "video not found")
    }

    return res.status(200).json(new ApiResponse(200, video, "video fetched sucessfulyy"))

    // const video = await Video.aggregate([
    // {
    //     $match:{
    //         videoId : mongoose.Types.ObjectId(videoId)
    //     }
    // },
    // {
    //     $lookup:{
    //         from: "likes",
    //         foreignField: "_id",
    //         localField: "video",
    //         as:"likes"
    //     }
    // }
    // ])
})

const updateVideo = asyncHandler(async (req, res) => {
//TODO: update video details like title, description, thumbnail
// 1. Get the videoId from the request params(frontend)
// 2. Get the title, description from the request body(frontend)
// 3. Find the video in the database by videoId
// 3.3 Check if the video is owned by the user [video.Owner.equals(req.user._id)] only owner can update the video
// 4. Get the thumbnail from the request body(frontend) and upload it to cloudinary
// 5. delete the old thumbnail from cloudinary
// 6. update the video details like title, description, thumbnail in the database
   
    const { videoId } = req.params
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "enter correct videoID")
    }

    const {title, discription} = req.body
    if (!(title && discription)) {
        throw new ApiError(400, "title and discription is required")
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(400, "video is not found")
    }

    // if (!video.Owner.equals(req.user._id)) {
    //     throw new ApiError(400, "unauthorized request")
    // }

    const thumbnailLocalPath = req.file?.path
    if (!thumbnailLocalPath) {
        throw new ApiError(400, "thumbnail is not found")
    }

    const thumbnail = await uploadOnCloudinary( thumbnailLocalPath, "img")

    if (!thumbnail) {
        throw new ApiError(400, "failed to upload")
    }

    const thumbnailOldUrl = video?.thumbnail
    const deleteOldThumbnail = await deleteFromCloudinary(thumbnailOldUrl, "img")
    if (!deleteOldThumbnail) {
        throw new ApiError(400, "thumbail not delete")
    }
    const updateVideoDetails = await Video.findByIdAndUpdate(videoId, {
        $set:{
            title: title,
            discription: discription,
            thumbnail : thumbnail.secure_url,
        }
    }, {new: true})

    return res.status(200).json(new ApiResponse(200, updateVideoDetails, "video details are updated"))
})

const deleteVideo = asyncHandler(async (req, res) => {
    //TODO: delete video
// 1. Get the videoId from the request params(frontend)  [http://localhost:8000/api/v1/video/delete-video/:videoId]
// 2. find the video in the database by videoId and delete it
// 2.2. Check if the video is owned by the user [video.Owner.equals(req.user._id)] only owner can delete the video
// 3. delete the videoFile and thumbnail from cloudinary
// 4. Delete the video document from the database

    const { videoId } = req.params
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400,"videoid is incorrect")
    }

    const video = await Video.findById(videoId)
    if (!videoId) {
        throw new ApiError(400, "video not found")
    }

    // const videoFile = await deleteFromCloudinary(video.videoFile)
    // const thumbnail = await deleteFromCloudinary(video.thumbnail)

    // if (!(videoFile && thumbnail)) {
    //     throw new ApiError(400, "video and thumbnail is not deleted")
    // }

    await Video.findByIdAndDelete(videoId)

    return res.status(200).json(new ApiResponse(200, {}, "video and thumbnail is deleted sucessfully"))

    
})

const togglePublishStatus = asyncHandler(async (req, res) => {
// 1. Get the videoId from the request params(frontend)  [http://localhost:8000/api/v1/video/toggle/:videoId]
// 2. findById the video in the database by videoId and check if the video is owned by the user
// 3. toggle the isPUblished field of the video document
    const { videoId } = req.params
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "enter correct videoID")
    }

    const toggleIsPublished = await Video.findOne({
        _id: videoId,
        owner: req.user._id
    })

    toggleIsPublished.isPublished = !toggleIsPublished.isPublished
    await toggleIsPublished.save()

    return res.status(200).json(200,toggleIsPublished, "toggle sucessfully")
})

export {
    getAllVideos,
    publishAllVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
