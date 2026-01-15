import React from 'react';

const StarryBackground: React.FC = () => {
    return (
        <>
            <style>{`
                @keyframes move-twink-back {
                    from { background-position: 0 0; }
                    to { background-position: -10000px 5000px; }
                }

                .starry-background {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: radial-gradient(ellipse at bottom, #1B2735 0%, #090A0F 100%);
                    overflow: hidden;
                    z-index: 0;
                }

                .stars, .twinkling {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    width: 100%;
                    height: 100%;
                    display: block;
                }

                .stars {
                    background: #000 url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACtWK6eAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEgAACxIB0t1+/AAAABZ0RVh0Q3JlYXRpb24gVGltZQAxMS8yNy8xORi9KzoAAAAcdEVYdFNvZnR3YXJlAEFkb2JlIEZpcmV3b3JrcyBDUzbovLKMAAAB/ElEQVR4nO3bS47bMABA0T/E/V+5S2vYqFFAwpAkyZct2gQk28e/f//5739+///39//+/v/7/1+//v7/339//f3/n9//+/v///d/ffz/n9+/////f/39v7//9/f/f/7+/////f+//v7f3//7+/9/f//v7///3f//8/f//v7/39///f3///+///z9///f3//7+/9/f//v7///3f//8/f//v7/39///f3///+///z9///f3//7+/9/f//v7///3f//8/f//v7/39///f3///+///z9///f3//7+/9/f//v7///3f//8/f//v7/39///f3///+///z9///f3//7+/9/f//v7///3f//8/f//v7/39///f3///+///z9///f3//7+/9/f//v7///3f//8/f//v7/39///f3///+///z9///f3//7+/9/f//v7///3f//8/f//v7/39///f3///+///z9///f3//7+/9/f//v7///3f//8/f//v7/39///f3///+///z9///f3//7+/9/f//v7///3f//8/f//v7/39///f3///+///z9///f3//7+/9/f//v7///3f//8/f//v7/39///f3///+///z9///f3//7+/9/f//v7///3f//8/f//v7/39///f3///+///z9///f3//7+/9/f//v7///3f//8/f//v7/39///f3///+///z9///f3//7+/9/f//v7///3f//8/f//v7/39///f3///+///z9///f3//7+/9/f//v7///3f//8/f//v7/39///f3///+///z9///f3//7+/9/f//v7///3f//8/f//v7/39///f3///+///z9///f3//7+/9/f//v7///3f//8/f//v7/39///f3///+///z9///f3//7+/9/f//v7///3f//8/f//v7/39') top center;
                    z-index: 1;
                }
                
                .twinkling {
                    background: transparent url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAYAAACtWK6eAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEgAACxIB0t1+/AAAABZ0RVh0Q3JlYXRpb24gVGltZQAxMS8yNy8xORi9KzoAAAAcdEVYdFNvZnR3YXJlAEFkb2JlIEZpcmV3b3JrcyBDUzbovLKMAAAB/ElEQVR4nO3bS47bMABA0T/E/V+5S2vYqFFAwpAkyZct2gQk28e/f//5739+///39//+/v/7/1+//v7/339//f3/n9//+/v///d/ffz/n9+/////f/39v7//9/f/f/7+/////f+//v7f3//7+/9/f//v7///3f//8/f//v7/39///f3///+///z9///f3//7+/9/f//v7///3f//8/f//v7/39///f3///+///z9///f3//7+/9/f//v7///3f//8/f//v7/39///f3///+///z9///f3//7+/9/f//v7///3f//8/f//v7/39///f3///+///z9///f3//7+/9/f//v7///3f//8/f//v7/39///f3///+///z9///f3//7+/9/f//v7///3f//8/f//v7/39///f3///+///z9///f3//7+/9/f//v7///3f//8/f//v7/39///f3///+///z9///f3//7+/9/f//v7///3f//8/f//v7/39///f3///+///z9///f3//7+/9/f//v7///3f//8/f//v7/39///f3///+///z9///f3//7+/9/f//v7///3f//8/f//v7/39///f3///+///z9///f3//7+/9/f//v7///3f//8/f//v7/39///f3///+///z9///f3//7+/9/f//v7///3f//8/f//v7/39///f3///+///z9///f3//7+/9/f//v7///3f//8/f//v7/39///f3///+///z9///f3//7+/9/f//v7///3f//8/f//v7/39///f3///+///z9///f3//7+/9/f//v7///3f//8/f//v7/39///f3///+///z9///f3//7+/9/f//v7///3f//8/f//v7/39///f3///+///z9///f3//7+/9/f//v7///3f//8/f//v7/39') repeat top center;
                    animation: move-twink-back 200s linear infinite;
                    z-index: 2;
                }
            `}</style>
            <div className="starry-background">
                <div className="stars"></div>
                <div className="twinkling"></div>
            </div>
        </>
    );
};

export default StarryBackground;