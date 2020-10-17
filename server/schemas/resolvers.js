const { AuthenticationError } = require('apollo-server-express');
const { User, Product, Category, Order } = require('../models');
const { signToken } = require('../utils/auth');
const stripe = require('stripe')('sk_test_4eC39HqLyjWDarjtT1zdp7dc');

const resolvers = {
    Query: {
        categories: async () => {
            try {
                return await Category.find();
            } catch (e) {
                throw new Error(`Something went wrong, message: ${e.message}`);
            }
        },
        products: async (parent, { category, name }) => {
            try {
                const params = {};
                if (category) {
                    params.category = category;
                }
                if (name) {
                    params.name = {
                        $regex: name
                    };
                }
                return await Product.find(params).populate('category');
            } catch (e) {
                throw new Error(`Something went wrong, message: ${e.message}`);
            }
        },
        product: async (parent, { _id }) => {
            try {
                return await Product.findById(_id).populate('category');
            } catch (e) {
                throw new Error(`Something went wrong, message: ${e.message}`);
            }
        },
        user: async (parent, args, context) => {
            if (context.user) {
                try {
                    const user = await User.findById(context.user._id).populate({
                        path: 'orders.products',
                        populate: 'category'
                    });
                    user.orders.sort((a, b) => b.purchaseDate - a.purchaseDate);
                    return user;
                } catch (e) {
                    throw new Error(`Something went wrong, message: ${e.message}`);
                }
            } else {
                throw new AuthenticationError('Not logged in');
            }
        },
        order: async (parent, { _id }, context) => {
            if (context.user) {
                try {
                    const user = await User.findById(context.user._id).populate({
                        path: 'orders.products',
                        populate: 'category'
                    });
                    return user.orders.id(_id);
                } catch (e) {
                    throw new Error(`Something went wrong, message: ${e.message}`);
                }
            } else {
                throw new AuthenticationError('Not logged in');
            }
        },
        checkout: async (parent, args, context) => {
            const url = new URL(context.headers.referer).origin;
            const order = new Order({ products: args.products });
            const line_items = [];
            
            const { products } = await order.populate('products').execPopulate();
            try {
                for (let i = 0; i < products.length; i++) {
                    const product = await stripe.products.create({
                        name: products[i].name,
                        description: products[i].description,
                        images: [`${url}/images/${products[i].image}`]
                    });
        
                    const price = await stripe.prices.create({
                        product: product.id,
                        unit_amount: products[i].price * 100,
                        currency: 'usd',
                    });
        
                    line_items.push({
                        price: price.id,
                        quantity: 1
                    });
                }
    
                const session = await stripe.checkout.sessions.create({
                    payment_method_types: ['card'],
                    line_items,
                    mode: 'payment',
                    success_url: `${url}/success?session_id={CHECKOUT_SESSION_ID}`,
                    cancel_url: `${url}/`
                });
    
                return { session: session.id };
            } catch (e) {
                throw new Error(`Something went wrong, message: ${e.message}`);
            }
        }
    },
    Mutation: {
        addUser: async (parent, args) => {
            try {
                const user = await User.create(args);
                const token = signToken(user);
    
                return { token, user };
            } catch (e) {
                throw new Error(`Something went wrong, message: ${e.message}`);
            }
        },
        addOrder: async (parent, { products }, context) => {
            console.log(context);
            if (context.user) {
                try {
                    const order = new Order({ products });
        
                    await User.findByIdAndUpdate(context.user._id, { $push: { orders: order } });
        
                    return order;
                } catch (e) {
                    throw new Error(`Something went wrong, message: ${e.message}`);
                }
            } else {
                throw new AuthenticationError('Not logged in');
            }
        },
        updateUser: async (parent, args, context) => {
            if (context.user) {
                try {
                    return await User.findByIdAndUpdate(context.user._id, args, { new: true });
                } catch (e) {
                    throw new Error(`Something went wrong, message: ${e.message}`);
                }
            } else {
                throw new AuthenticationError('Not logged in');
            }
        },
        updateProduct: async (parent, { _id, quantity }) => {
            try {
                const decrement = Math.abs(quantity) * -1;
                return await Product.findByIdAndUpdate(_id, { $inc: { quantity: decrement } }, { new: true });
            } catch (e) {
                throw new Error(`Something went wrong, message: ${e.message}`);
            }
        },
        login: async (parent, { email, password }) => {
            try {
                const user = await User.findOne({ email });
    
                if (!user) {
                    throw new AuthenticationError('Incorrect credentials');
                }
    
                const correctPw = await user.isCorrectPassword(password);
    
                if (!correctPw) {
                    throw new AuthenticationError('Incorrect credentials');
                }
    
                const token = signToken(user);
    
                return { token, user };
    
            } catch (e) {
                throw new Error(`Something went wrong, message: ${e.message}`);
            }
        }
    }
};

module.exports = resolvers;
