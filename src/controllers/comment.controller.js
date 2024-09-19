import mongoose , {isValidObjectId} from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query
    
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "enter the valid videoId")
    }

    let pipeline=[{
        $match:{
            video : new mongoose.Types.ObjectId(videoId)
        }
    }, {
        $lookup:{
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "owner",
            pipeline:[{
                $project:{
                    _id: 1,
                    fullName: 1,
                    username: 1,
                    avatar: 1
                }
            }]
        }
    },{
        $lookup:{
            from: "likes",
            foreignField: "comment",
            localField: "_id",
            as: "likes"
        }
    }, {
        $addFields:{
            likescount:{
                $size: "$likes"
            }
        }
    },{
        $project:{
            likescount: 1,
        }
    }]

    const options={
        page: parseInt(page),
        limit: parseInt(limit),
        customeLable:{
            totalDocs: "totalComments",
            docs: "comments"
        }
    }

    const result = await Comment.aggregatePaginate(pipeline, options)

    if (result?.comment?.length === 0) {
        throw new ApiError(400, "no comment found")
    }

    return res.status(200).json(new ApiResponse(200, result, "comment fetched sucessfully"))

})

const addComment = asyncHandler(async (req, res) => {
// TODO: add a comment to a video
// 1. get videoId from params URL and content from req.body
// 2. create a new comment and save it to the database

    const {videoId} = req.params
    const {content} = req.body

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "enter the correct videoID")
    }
    if (!content) {
        throw new ApiError(400, "no comment")
    }

    const comment = await Comment.create({
        content: content,
        video: videoId,
        owner: new mongoose.Types.ObjectId(req.user?._id)
    })
    if (!comment) {
        throw new ApiError(400,"comment not saved")
    }

    return res.status(200).json(new ApiResponse(200,comment,"commet saved"))
})

const updateComment = asyncHandler(async (req, res) => {
// TODO: update a comment
// 1. get commentId from params URL and content from req.body
// 2. find the comment by commentId and req.user._id. // only owner can update the comment
// 3. update the comment content and save it to the database

    const {commentId} = req.params
    const {content} = req.body

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "enter the correct commentID")
    }
    if (!content) {
        throw new ApiError(400, "no comment")
    }
    const comment = await Comment.findOne({
        _id : commentId,
        owner: req.user?._id
    })
    
    if (!comment) {
        throw new ApiError(400,"comment not found")
    }

    comment.content = content
    await comment.save()

    return res.status(200).json(new ApiResponse(200, comment, "update comment"))
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment

    const {commentId} = req.params
    const {content} = req.body

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "enter the correct commentID")
    }
    const delComment = await Comment.findOne({
        $and:[{_id: commentId},
            {owner: req.user?._id}
        ]
    })

    if (!delComment) {
        throw new ApiError(400, "comment not found")
    }

    if (delComment.delComment === 0) {
        return res.status(500).json(new ApiError(500, "you're not authorized"))
    }

    return res.status(200).json(new ApiResponse(200, {}, "comment is deleted"))


})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }